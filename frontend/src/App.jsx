import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

// Icons & Subcomponents
import {
  Grid,
  Layers,
  CheckSquare,
  Truck,
  ShoppingCart,
  ShieldCheck,
  UserCheck,
  Database,
  AlertTriangle,
} from './components/MomentumIcons';

// API Services
import {
  loginUser,
  registerUser,
  googleSignInApi,
  toggleUserStatus,
  updateUser,
  deleteUser,
  fetchAllUsers,
  fetchStorageProfiles,
  fetchAllBatches,
  createFoodBatch,
  updateFoodBatch,
  generateItemQrCodes,
  startDriverTrip,
  completeDriverTrip,
  syncIotProfileOta,
  sendRelayCommand,
  fetchTelemetryByBatch,
  verifyBlockchainIntegrity,
  runQcAudit,
  approveQcGate,
  stockShelfFefo,
  fetchFefoQueues,
  posCheckout,
  triggerEmergencyRecall,
  fetchNoSqlOverview,
  getCassandraCsvExportUrl,
  getMongoJsonExportUrl,
} from './services/api';

// Common Components & Modals
import DesktopHeader from './components/common/DesktopHeader';
import Sidebar from './components/common/Sidebar';
import UserProfileModal from './components/common/Modals/UserProfileModal';
import UserDetailModal from './components/common/Modals/UserDetailModal';

// Dedicated Pages
import AuthPages from './pages/AuthPages';
import OverviewPage from './pages/OverviewPage';
import BatchesPage from './pages/BatchesPage';
import ColdChainIotPage from './pages/ColdChainIotPage';
import QcInspectionPage from './pages/QcInspectionPage';
import ShelfFefoPosPage from './pages/ShelfFefoPosPage';
import BlockchainTracePage from './pages/BlockchainTracePage';
import UserManagementPage from './pages/UserManagementPage';
import AdminSystemPage from './pages/AdminSystemPage';
import PublicConsumerTracePage from './components/PublicConsumerTracePage';
import ConsumerPortalPage from './pages/ConsumerPortalPage';

// RBAC Actors Configuration
const RBAC_ACTORS = [
  { role: 'ADMIN', name: 'Quản Trị Hệ Thống', dept: 'System Admin', desc: 'Toàn quyền cấu hình và điều hành hệ thống' },
  { role: 'PRODUCER', name: 'Nông Trại Sản Xuất', dept: 'Producer', desc: 'Khai báo lô hàng và đúc Genesis Block' },
  { role: 'QC_INSPECTOR', name: 'Kiểm Định Viên QC', dept: 'Quality Control', desc: 'Kiểm toán vi khí hậu và đánh giá TTI' },
  { role: 'LOGISTICS_DRIVER', name: 'Tài Xế Xe Lạnh', dept: 'Logistics', desc: 'Vận chuyển và đồng bộ thông số vi khí hậu' },
  { role: 'INBOUND_GATE', name: 'Thủ Kho Nhận Hàng', dept: 'Inbound Gate', desc: 'Nghiệm thu và ký số tiếp nhận siêu thị' },
  { role: 'SHELF_OPERATOR', name: 'Quản Lý Quầy Kệ', dept: 'Shelf Operator', desc: 'Sắp xếp hàng hóa theo ưu tiên FEFO' },
  { role: 'CASHIER', name: 'Thu Ngân Quầy POS', dept: 'POS Cashier', desc: 'Quét mã bán hàng và hủy tem thanh toán' },
  { role: 'CONSUMER', name: 'Người Tiêu Dùng', dept: 'Public Consumer', desc: 'Quét tem tra cứu thông tin minh bạch' },
];

const ROLE_ALLOWED_TABS = {
  ADMIN: ['overview', 'batches', 'iot', 'qc', 'shelf', 'trace', 'users', 'admin'],
  PRODUCER: ['batches', 'trace'],
  LOGISTICS_DRIVER: ['iot'],
  QC_INSPECTOR: ['qc'],
  INBOUND_GATE: ['qc'],
  SHELF_OPERATOR: ['shelf'],
  CASHIER: ['shelf'],
  CONSUMER: ['trace'],
};

const FOOD_CATEGORIES = [
  { code: 'VEG_FRUIT', name: 'Rau Củ Quả & Trái Cây', temp: '8°C - 12°C', gas: 'C2H4 < 30 ppm', rule: 'Chống tổn thương lạnh (<5°C)' },
  { code: 'CHILLED_MEAT', name: 'Thịt Tươi Mát', temp: '0°C - 4°C', gas: 'NH3 < 20 ppm', rule: 'Kiểm soát Salmonella, pH 5.5-6.2' },
  { code: 'FRESH_SEAFOOD', name: 'Thủy Hải Sản Tươi', temp: '0°C - 2°C', gas: 'TMA < 15 ppm', rule: 'Bảo quản đá vảy, chống ươn thối' },
  { code: 'DAIRY', name: 'Sữa & Bơ Sữa', temp: '2°C - 6°C', gas: 'Lactic < 0.18%', rule: 'Cấm đông đá kết tủa protein' },
  { code: 'DEEP_FROZEN', name: 'Đông Lạnh Sâu', temp: '≤ -18°C', gas: 'Biến tính = 0', rule: 'Cảnh báo rã đông lặp lại Freeze-Thaw' },
  { code: 'DELI_HOT', name: 'Thực Phẩm Chế Biến Sẵn', temp: '≥ 60°C', gas: 'HACCP Safe', rule: 'Vượt khỏi vùng nguy hiểm 5-60°C' },
];

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/trace/:code" element={<PublicConsumerTracePage />} />
        <Route path="/*" element={<MainDashboardLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

function MainDashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Theme state
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

  // User & JWT state: Bắt buộc đăng nhập, không có mặc định bypass vào dashboard
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('smartchain_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [jwtToken, setJwtToken] = useState(() => {
    try {
      return localStorage.getItem('smartchain_jwt_token') || null;
    } catch (e) {
      return null;
    }
  });

  // Navigation tabs state
  const initialRole = currentUser?.role || 'ADMIN';
  const initialAllowedTabs = ROLE_ALLOWED_TABS[initialRole] || ['overview'];
  const [activeTab, setActiveTab] = useState(initialAllowedTabs[0] || 'overview');
  const [activeRole, setActiveRole] = useState(() => RBAC_ACTORS.find((r) => r.role === initialRole) || RBAC_ACTORS[0]);

  // Auth form states: Để trống ban đầu, bắt buộc người dùng nhập
  const [authPortalMode, setAuthPortalMode] = useState('gateway');
  const [enterpriseLoginRole, setEnterpriseLoginRole] = useState('LOGISTICS_DRIVER');
  const [authView, setAuthView] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Modals & UI states
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // User Management
  const [enterpriseUsersList, setEnterpriseUsersList] = useState([]);
  const [userFilterRole, setUserFilterRole] = useState('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  // New enterprise user form: Để trống ban đầu, không gán cứng mật khẩu hay biển số
  const [newEnterpriseRole, setNewEnterpriseRole] = useState('LOGISTICS_DRIVER');
  const [newEnterpriseUsername, setNewEnterpriseUsername] = useState('');
  const [newEnterprisePassword, setNewEnterprisePassword] = useState('');
  const [newEnterpriseFullName, setNewEnterpriseFullName] = useState('');
  const [newEnterpriseDept, setNewEnterpriseDept] = useState('Logistics');
  const [newEnterprisePhone, setNewEnterprisePhone] = useState('');
  const [newEnterpriseIdentityCard, setNewEnterpriseIdentityCard] = useState('');
  const [newEnterpriseAssignedEntity, setNewEnterpriseAssignedEntity] = useState('');
  const [newEnterpriseNotes, setNewEnterpriseNotes] = useState('');

  // Search History
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('smartchain_search_history');
      return stored ? JSON.parse(stored) : ['LOT-VEG-2026-001', '49C-567.89', 'Xà Lách Thủy Canh'];
    } catch (e) {
      return ['LOT-VEG-2026-001', '49C-567.89', 'Xà Lách Thủy Canh'];
    }
  });
  const [isSearchHistoryOpen, setIsSearchHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time telemetry & batches data
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const selectedBatchRef = useRef(selectedBatch);

  // Phân quyền chọn Lô nghiêm ngặt: Chỉ ADMIN xem được tất cả các lô, các vai trò khác chỉ xem lô thuộc trách nhiệm
  const accessibleBatches = React.useMemo(() => {
    if (!Array.isArray(batches) || batches.length === 0) return [];
    const role = currentUser?.role || 'ADMIN';
    if (role === 'ADMIN') return batches;

    if (role === 'PRODUCER') {
      return batches.filter(
        (b) =>
          b.category === 'VEG_FRUIT' ||
          b.category_code === 'VEG_FRUIT' ||
          (b.farm_name && b.farm_name.toLowerCase().includes('đà lạt')) ||
          (b.farm_name && b.farm_name.toLowerCase().includes('langbiang')) ||
          b.batch_code?.startsWith('LOT-VEG')
      );
    }
    if (role === 'LOGISTICS_DRIVER') {
      const currentDriverName = (currentUser?.fullName || currentUser?.username || '').toLowerCase().trim();
      const userAssignedPlate = (currentUser?.assignedEntity || currentUser?.assignedVehicle || '').toUpperCase().trim();

      return batches.filter((b) => {
        const batchTransport = b.transportJourney || b.transport_journey || {};
        const assignedDriver = (
          batchTransport.driver_name ||
          b.transport_driver_name ||
          b.driver_name ||
          ''
        ).toLowerCase().trim();
        const assignedPlate = (
          batchTransport.vehicle_plate ||
          b.transport_vehicle_plate ||
          b.vehicle_plate ||
          b.vehiclePlate ||
          ''
        ).toUpperCase().trim();

        const hasAssigned = Boolean(
          (assignedDriver && !assignedDriver.includes('chưa') && assignedDriver !== '') ||
            (assignedPlate && !assignedPlate.includes('CHƯA') && assignedPlate !== '')
        );

        // Lô chưa được Admin điều phối cho tài xế nào -> Tài xế không tự ý lấy
        if (!hasAssigned) {
          return false;
        }

        if (currentDriverName && assignedDriver && (assignedDriver.includes(currentDriverName) || currentDriverName.includes(assignedDriver))) {
          return true;
        }
        if (userAssignedPlate && assignedPlate && assignedPlate.includes(userAssignedPlate)) {
          return true;
        }
        if (currentUser?.username === 'driver_01' && (assignedPlate.includes('49C-567.89') || assignedDriver.includes('nam'))) return true;
        if (currentUser?.username === 'driver_02' && (assignedPlate.includes('51D-998.12') || assignedDriver.includes('phạm'))) return true;
        if (currentUser?.username === 'driver_03' && (assignedPlate.includes('65C-445.18') || assignedDriver.includes('hải'))) return true;
        if (currentUser?.username === 'driver_04' && (assignedPlate.includes('43C-882.34') || assignedDriver.includes('tùng'))) return true;
        if (currentUser?.username === 'driver_05' && (assignedPlate.includes('29H-771.05') || assignedDriver.includes('long'))) return true;
        if (currentUser?.username === 'driver_06' && (assignedPlate.includes('60C-339.67') || assignedDriver.includes('dũng'))) return true;

        return false;
      });
    }
    if (role === 'QC_INSPECTOR' || role === 'INBOUND_GATE') {
      return batches.filter((b) =>
        ['DELIVERED', 'ARRIVED_AT_STORE', 'IN_TRANSIT', 'QC_ACCEPTED', 'QC_REJECTED'].includes(
          b.status
        )
      );
    }
    if (role === 'SHELF_OPERATOR') {
      return batches.filter((b) =>
        ['QC_ACCEPTED', 'ON_SHELF', 'SOLD'].includes(b.status)
      );
    }
    if (role === 'CASHIER') {
      return batches.filter((b) =>
        ['ON_SHELF', 'SOLD', 'QC_ACCEPTED'].includes(b.status)
      );
    }
    return batches;
  }, [batches, currentUser]);

  useEffect(() => {
    // Giữ trạng thái "Chưa chọn lô hàng" (selectedBatch = null) cho đến khi người dùng/tài xế chủ động chọn lô.
    // Nếu đang chọn một lô hàng, cập nhật lại dữ liệu mới nhất của lô đó từ danh sách accessibleBatches.
    if (selectedBatch) {
      const matched = accessibleBatches.find((b) => b.batch_code === selectedBatch.batch_code);
      if (!matched) {
        setSelectedBatch(null);
      } else if (matched !== selectedBatch) {
        setSelectedBatch(matched);
      }
    }
  }, [accessibleBatches, currentUser]);

  const [profiles, setProfiles] = useState([]);
  const [telemetryList, setTelemetryList] = useState([]);
  const [latestTelemetry, setLatestTelemetry] = useState(null);
  const [relayState, setRelayState] = useState(false);
  const [fefoQueues, setFefoQueues] = useState([]);
  const [nosqlOverview, setNosqlOverview] = useState(null);
  const [systemAlert, setSystemAlert] = useState(null);

  // Batch creation form: Để trống hoàn toàn ban đầu
  const [newBatchCategory, setNewBatchCategory] = useState('VEG_FRUIT');
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchFarm, setNewBatchFarm] = useState('');
  const [newBatchWeight, setNewBatchWeight] = useState('');
  const [newBatchVehicle, setNewBatchVehicle] = useState('');
  const [newBatchPolyFields, setNewBatchPolyFields] = useState({
    brix: 11.5,
    neemPpm: 0.0,
    ph: 5.8,
    tmaPpm: 1.2,
    lacticAcidPct: 0.12,
    coreTemp: -19.5,
    cookingTemp: 78.5,
  });

  // QR & QC states
  const [generatedQrs, setGeneratedQrs] = useState(null);
  const [qrQuantity, setQrQuantity] = useState(12);
  const [qcAuditResult, setQcAuditResult] = useState(null);
  const [qcSignatureNote, setQcSignatureNote] = useState('Kiểm tra ngoại quan đạt chuẩn, không phát hiện vi sinh lạ.');

  // POS Scanner states
  const [posSerialInput, setPosSerialInput] = useState('');
  const [posCheckoutResult, setPosCheckoutResult] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);

  // Recall states: Để trống lý do thu hồi ban đầu
  const [recallReason, setRecallReason] = useState('');
  const [recallResult, setRecallResult] = useState(null);

  // Blockchain verification
  const [blockchainVerification, setBlockchainVerification] = useState(null);

  // System Initialization: Chỉ tải dữ liệu lõi khi đã đăng nhập hợp lệ
  useEffect(() => {
    if (currentUser && jwtToken) {
      refreshCoreData();
    }
  }, [currentUser, jwtToken]);

  const refreshCoreData = async () => {
    try {
      const [batchRes, profRes, fefoRes, nosqlRes] = await Promise.allSettled([
        fetchAllBatches(),
        fetchStorageProfiles(),
        fetchFefoQueues(),
        fetchNoSqlOverview(),
      ]);

      if (batchRes.status === 'fulfilled' && Array.isArray(batchRes.value)) {
        setBatches(batchRes.value);
      }
      if (profRes.status === 'fulfilled') setProfiles(profRes.value);
      if (fefoRes.status === 'fulfilled') setFefoQueues(fefoRes.value);
      if (nosqlRes.status === 'fulfilled') setNosqlOverview(nosqlRes.value);
    } catch (err) {
      console.error('Error refreshing core data:', err);
    }
  };

  useEffect(() => {
    selectedBatchRef.current = selectedBatch;
    if (!selectedBatch?.batch_code) {
      setTelemetryList([]);
      setLatestTelemetry(null);
      setBlockchainVerification(null);
      return;
    }
    fetchTelemetryByBatch(selectedBatch.batch_code)
      .then((data) => {
        if (Array.isArray(data)) {
          setTelemetryList(data);
          setLatestTelemetry(data.length > 0 ? data[0] : null);
        }
      })
      .catch((err) => console.warn('Telemetry fetch error:', err.message));

    verifyBlockchainIntegrity(selectedBatch.batch_code)
      .then((data) => setBlockchainVerification(data))
      .catch((err) => console.warn('Blockchain verify error:', err.message));

    // Chỉ tự động đồng bộ OTA xuống phần cứng khi lô hàng thực sự đang chạy (IN_TRANSIT) và có biển số xe hợp lệ
    if (selectedBatch?.status === 'IN_TRANSIT' && (selectedBatch?.category || selectedBatch?.category_code)) {
      const batchTransport =
        selectedBatch?.transportJourney || selectedBatch?.transport_journey || {};
      const plate = (
        batchTransport.vehicle_plate ||
        selectedBatch?.transport_vehicle_plate ||
        selectedBatch?.vehiclePlate ||
        ''
      ).trim();
      if (plate && !plate.toUpperCase().includes('CHƯA')) {
        syncIotProfileOta({
          batchCode: selectedBatch.batch_code,
          categoryCode: selectedBatch.category_code || selectedBatch.category,
          vehiclePlate: plate,
        }).catch(() => {});
      }
    }
  }, [selectedBatch?.batch_code, selectedBatch?.status]);

  // WebSocket STOMP for Realtime Telemetry
  useEffect(() => {
    let stompClient = null;
    try {
      const socket = new SockJS('http://localhost:8080/ws-smartchain');
      stompClient = Stomp.over(socket);
      stompClient.debug = () => {};
      stompClient.connect(
        {},
        () => {
          stompClient.subscribe('/topic/telemetry', (message) => {
            try {
              const body = JSON.parse(message.body);
              const incomingBatch = body.batch_code || body.batchCode;

              // ĐẢM BẢO KHÔNG BỊ TRỘN LẪN DỮ LIỆU: Chỉ nhận telemetry nếu thuộc đúng lô đang hiển thị!
              if (
                selectedBatchRef.current?.batch_code &&
                incomingBatch &&
                incomingBatch !== selectedBatchRef.current.batch_code
              ) {
                return; // Bỏ qua gói tin của lô khác, giữ cho dữ liệu từng tài xế hoàn toàn độc lập!
              }

              setLatestTelemetry(body);
              setTelemetryList((prev) => [body, ...prev.slice(0, 49)]);
              const rState = body.relay_state ?? body.relay_cooling ?? body.relayCooling;
              if (rState !== undefined) {
                setRelayState(Boolean(rState));
              }

              const isBreached = Boolean(body.is_breached || (body.alert_status && body.alert_status !== 'NORMAL'));
              const alt = String(body.alert_status || '').toUpperCase();
              const gasVal = body.gas_ppm ?? body.gas_value ?? 0;
              const tempVal = body.temperature ?? body.temp ?? 0;
              const gasType = body.gas_type || 'C2H4';
              const batch = body.batch_code || selectedBatch?.batch_code || 'Lô hàng';

              if (isBreached) {
                let alertMsg = '';
                if (alt.includes('SPOILAGE_GAS') || alt.includes('GAS') || (!alt.includes('TEMP') && !alt.includes('CHILLING') && gasVal > 30.0)) {
                  alertMsg = `CẢNH BÁO KHÍ SINH HỌC: ${batch} phát hiện khí ${gasType} (${gasVal} ppm) vượt ngưỡng an toàn!`;
                } else if (alt.includes('DOOR') || body.door_open) {
                  alertMsg = `CẢNH BÁO MỞ CỬA: Thùng xe ${body.vehicle_id || 'lạnh'} chở lô ${batch} bị mở cửa bất thường!`;
                } else if (alt.includes('CHILLING') || (tempVal < 8.0 && body.category_code === 'VEG_FRUIT')) {
                  alertMsg = `CẢNH BÁO TỔN THƯƠNG LẠNH: ${batch} nhiệt độ ${tempVal}°C thấp hơn ngưỡng tối thiểu 8.0°C!`;
                } else if (alt.includes('DEFROST') || (tempVal > -18.0 && body.category_code === 'DEEP_FROZEN')) {
                  alertMsg = `CẢNH BÁO NGUY CƠ RÃ ĐÔNG: ${batch} nhiệt độ ${tempVal}°C vượt ngưỡng đông sâu -18.0°C!`;
                } else {
                  alertMsg = `CẢNH BÁO VI PHẠM NHIỆT ĐỘ: ${batch} nhiệt độ ${tempVal}°C vượt ngưỡng an toàn!`;
                }
                setSystemAlert({ type: 'danger', message: alertMsg });
              } else {
                setSystemAlert((prev) => {
                  const wasDanger = prev && (typeof prev === 'string' ? prev.includes('CẢNH BÁO') : prev.type === 'danger');
                  if (wasDanger) {
                    setTimeout(() => setSystemAlert(null), 5000);
                    return {
                      type: 'success',
                      message: `TRẠNG THÁI AN TOÀN: ${batch} vi khí hậu đã trở về vị trí cân bằng đạt chuẩn (${tempVal}°C, ${gasVal} ppm ${gasType})!`,
                    };
                  }
                  return prev;
                });
              }
            } catch (e) {
              console.error('STOMP parse error:', e);
            }
          });

          // Lắng nghe sự kiện đồng bộ trạng thái chuyến xe, điều phối lô & mở cửa thùng xe thời gian thực
          stompClient.subscribe('/topic/batch-status', (message) => {
            try {
              const body = JSON.parse(message.body);
              if (body.batchCode) {
                if (body.status === 'READY_FOR_PICKUP' || body.event === 'DRIVER_RESET' || body.status === 'CREATED') {
                  localStorage.removeItem(`trip_start_${body.batchCode}`);
                }

                // Tải lại dữ liệu lõi để cập nhật đầy đủ transport_journey, trạng thái cửa và phân công tài xế
                refreshCoreData();

                // Phát sự kiện đồng bộ toàn ứng dụng
                window.dispatchEvent(new CustomEvent('batch-status-changed', { detail: body }));

                if (body.event === 'DRIVER_DEPARTED') {
                  setSystemAlert({
                    type: 'success',
                    message: `XE LẠNH ĐÃ KHỞI HÀNH: Tài xế ${body.driverName || ''} (${body.vehiclePlate || ''}) đã bắt đầu vận chuyển lô ${body.batchCode}. Dữ liệu chuỗi lạnh đang cập nhật!`,
                  });
                } else if (body.event === 'DRIVER_ARRIVED') {
                  setSystemAlert({
                    type: 'success',
                    message: `XE LẠNH ĐÃ CẬP BẾN: Lô ${body.batchCode} đã hoàn thành chuyến xe đến ${body.supermarket || 'Siêu thị'} an toàn!`,
                  });
                } else if (body.event === 'DRIVER_RESET') {
                  setSystemAlert({
                    type: 'success',
                    message: `ĐÃ ĐẶT LẠI TRẠNG THÁI: Lô ${body.batchCode} đã trở về trạng thái Chờ khởi hành!`,
                  });
                } else if (body.event === 'BATCH_ASSIGNED') {
                  setSystemAlert({
                    type: 'success',
                    message: `ĐIỀU PHỐI LÔ HÀNG: Admin đã phân công lô ${body.batchCode} cho tài xế ${body.driverName} (${body.vehiclePlate}). Đang chờ tài xế xác nhận!`,
                  });
                } else if (body.event === 'BATCH_REVOKED') {
                  setSystemAlert({
                    type: 'warning',
                    message: `THU HỒI ĐIỀU PHỐI: Lô ${body.batchCode} đã được hủy phân công và đưa về kho chờ điều phối lại.`,
                  });
                } else if (body.event === 'DRIVER_ACCEPTED_BATCH') {
                  setSystemAlert({
                    type: 'success',
                    message: `TÀI XẾ ĐÃ NHẬN LÔ: Tài xế ${body.driverName} (${body.vehiclePlate}) đã xác nhận nhận lô ${body.batchCode} vào hàng đợi vận chuyển!`,
                  });
                } else if (body.event === 'DRIVER_REJECTED_BATCH') {
                  setSystemAlert({
                    type: 'warning',
                    message: `TÀI XẾ TỪ CHỐI LÔ: Tài xế ${body.driverName} đã từ chối nhận lô ${body.batchCode}${body.reason ? ` (${body.reason})` : ''}. Vui lòng phân công tài xế khác!`,
                  });
                } else if (body.event === 'DOOR_OPEN_REQUESTED') {
                  setSystemAlert({
                    type: 'warning',
                    message: `YÊU CẦU MỞ CỬA KHẨN CẤP: Tài xế ${body.driverName} (${body.vehiclePlate}) xin phép mở cửa thùng xe lô ${body.batchCode} trên đường — Lý do: "${body.reason}"`,
                  });
                } else if (body.event === 'DOOR_OPEN_APPROVED') {
                  setSystemAlert({
                    type: 'success',
                    message: `ĐÃ PHÊ DUYỆT MỞ CỬA: Admin đã cấp phép mở cửa khẩn cấp cho xe ${body.vehiclePlate} (Lô ${body.batchCode})!`,
                  });
                } else if (body.event === 'DOOR_OPEN_REJECTED') {
                  setSystemAlert({
                    type: 'danger',
                    message: `TỪ CHỐI MỞ CỬA: Admin không cho phép mở cửa thùng xe lô ${body.batchCode} khi chưa tới điểm đích!`,
                  });
                } else if (body.event === 'UNAUTHORIZED_DOOR_OPEN') {
                  setSystemAlert({
                    type: 'danger',
                    message: body.message || `CẢNH BÁO AN NINH NGHIÊM TRỌNG: Tài xế ${body.driverName} (${body.vehiclePlate}) đã TỰ Ý MỞ CỬA THÙNG XE lô ${body.batchCode} khi chưa tới điểm giao và chưa có lệnh Admin!`,
                  });
                } else if (body.event === 'DOOR_OPENED_AT_DESTINATION') {
                  setSystemAlert({
                    type: 'success',
                    message: `ĐÃ MỞ CỬA TẠI ĐIỂM GIAO: Xe ${body.vehiclePlate} đã mở cửa thùng xe tại điểm đích để bốc dỡ lô ${body.batchCode}.`,
                  });
                } else if (body.event === 'DOOR_OPENED_FOR_LOADING') {
                  setSystemAlert({
                    type: 'success',
                    message: `MỞ CỬA NHẬN HÀNG: Tài xế ${body.driverName || ''} (${body.vehiclePlate || ''}) đã mở cửa thùng xe tại kho xuất phát để xếp lô ${body.batchCode} lên xe.`,
                  });
                } else if (body.event === 'LOADING_CONFIRMED_DOOR_CLOSED') {
                  setSystemAlert({
                    type: 'success',
                    message: `ĐÃ XÁC NHẬN VẬN CHUYỂN & ĐÓNG CỬA: Lô ${body.batchCode} đã được bốc xếp lên xe ${body.vehiclePlate || ''} và khóa niêm phong cửa thùng xe. Sẵn sàng khởi hành!`,
                  });
                } else if (body.event === 'DOOR_CLOSED') {
                  setSystemAlert({
                    type: 'success',
                    message: body.message || `ĐÃ ĐÓNG CỬA THÙNG XE: Cửa thùng xe ${body.vehiclePlate || ''} (Lô ${body.batchCode}) đã được đóng kín và khóa an toàn.`,
                  });
                }
              }
            } catch (e) {
              console.error('STOMP batch-status parse error:', e);
            }
          });
        },
        (error) => {
          console.warn('STOMP connection error:', error);
        }
      );
    } catch (e) {
      console.warn('SockJS init error:', e);
    }

    return () => {
      if (stompClient && stompClient.connected) {
        stompClient.disconnect();
      }
    };
  }, []);

  // Login handler: Xác thực nghiêm ngặt và phân cổng chính xác
  const handleLoginSubmit = async (e, customUser, customPass) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    let uName = authUsername;
    let uPass = authPassword;

    if (typeof e === 'string' && e.trim()) {
      uName = e;
      if (typeof customUser === 'string') uPass = customUser;
    } else if (typeof customUser === 'string' && customUser.trim()) {
      uName = customUser;
      if (typeof customPass === 'string') uPass = customPass;
    }

    uName = (uName || '').trim();
    uPass = (uPass || '').trim();

    if (!uName || !uPass) {
      setAuthError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await loginUser(uName, uPass);
      if (res?.token) {
        const effectivePortal =
          location.pathname.startsWith('/admin') ? 'admin' :
          location.pathname.startsWith('/enterprise') ? 'enterprise' :
          location.pathname.startsWith('/consumer') ? 'consumer' : authPortalMode;

        if (effectivePortal === 'admin' && res.role !== 'ADMIN') {
          setAuthError(`Cổng Quản Trị chỉ chấp nhận tài khoản Quản trị viên (ADMIN)! Tài khoản của bạn có vai trò [${res.role}], vui lòng chuyển sang Cổng Doanh Nghiệp hoặc Khách Hàng.`);
          setAuthLoading(false);
          return;
        }
        if (effectivePortal === 'enterprise') {
          if (res.role === 'ADMIN') {
            setAuthError('Tài khoản Quản trị viên (ADMIN) vui lòng đăng nhập tại Cổng Quản Trị Hệ Thống riêng biệt!');
            setAuthLoading(false);
            return;
          }
          if (res.role === 'CONSUMER') {
            setAuthError('Tài khoản Khách Hàng Tiêu Dùng vui lòng đăng nhập tại Cổng Khách Hàng Tiêu Dùng!');
            setAuthLoading(false);
            return;
          }
          if (enterpriseLoginRole && res.role !== enterpriseLoginRole) {
            setAuthError(`Tài khoản "${uName}" có vai trò [${res.role}], không khớp với vai trò được chọn [${enterpriseLoginRole}]. Vui lòng chọn đúng vai trò của bạn!`);
            setAuthLoading(false);
            return;
          }
        }
        if (effectivePortal === 'consumer' && res.role !== 'CONSUMER') {
          setAuthError(`Cổng này dành riêng cho Khách Hàng Tiêu Dùng! Tài khoản của bạn là Cán bộ Doanh nghiệp (${res.role}), vui lòng đăng nhập tại Cổng Cán Bộ Doanh Nghiệp.`);
          setAuthLoading(false);
          return;
        }

        setJwtToken(res.token);
        localStorage.setItem('smartchain_jwt_token', res.token);

        const usr = {
          userId: res.userId,
          username: res.username || uName,
          fullName: res.fullName || uName,
          role: res.role || 'CONSUMER',
          department: res.department || 'Operations',
          phone: res.phone || '',
          identityCard: res.identityCard || '',
          assignedEntity: res.assignedEntity || '',
          notes: res.notes || '',
          createdAt: res.createdAt,
        };
        setCurrentUser(usr);
        localStorage.setItem('smartchain_user', JSON.stringify(usr));
        const matchingActor = RBAC_ACTORS.find((r) => r.role === usr.role) || RBAC_ACTORS[0];
        setActiveRole(matchingActor);

        const allowed = ROLE_ALLOWED_TABS[usr.role] || ['overview'];
        if (!allowed.includes(activeTab)) {
          setActiveTab(allowed[0]);
        }
        navigate('/');
        setSystemAlert({
          type: 'success',
          message: `Xác thực thành công! Đã đăng nhập: ${usr.fullName} (${usr.role})`,
        });
        setTimeout(() => setSystemAlert(null), 5000);
      } else {
        setAuthError(res?.message || 'Đăng nhập không thành công.');
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.error === 'USER_NOT_FOUND' || err.response?.status === 404) {
        setAuthError(`Tài khoản "${uName}" không tồn tại trên hệ thống! Vui lòng kiểm tra lại tên đăng nhập hoặc liên hệ Quản trị viên cấp phát.`);
      } else if (errData?.error === 'INVALID_CREDENTIALS') {
        setAuthError('Mật khẩu không chính xác! Vui lòng kiểm tra lại mật khẩu.');
      } else if (errData?.error === 'ACCOUNT_DISABLED') {
        setAuthError('Tài khoản này đã bị tạm khóa hoặc vô hiệu hóa bởi Quản trị viên!');
      } else {
        setAuthError(errData?.message || err.message || 'Lỗi xác thực người dùng!');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Register Consumer handler
  const handleRegisterConsumer = async (e) => {
    e.preventDefault();
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('Mật khẩu xác nhận không khớp! Vui lòng kiểm tra lại.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await registerUser({
        username: authUsername.trim(),
        password: authPassword.trim(),
        fullName: authFullName.trim() || authUsername.trim(),
        department: 'Khách Hàng Tiêu Dùng',
        role: 'CONSUMER',
        phone: authPhone.trim(),
      });
      if (res?.token) {
        setJwtToken(res.token);
        const usr = {
          userId: res.userId,
          username: res.username || authUsername.trim(),
          fullName: res.fullName || authFullName.trim() || authUsername.trim(),
          role: 'CONSUMER',
          department: 'Khách Hàng Tiêu Dùng',
          phone: res.phone || authPhone.trim(),
        };
        setCurrentUser(usr);
        localStorage.setItem('smartchain_user', JSON.stringify(usr));
        const matchingActor = RBAC_ACTORS.find((r) => r.role === 'CONSUMER') || RBAC_ACTORS[7];
        setActiveRole(matchingActor);
        setActiveTab('overview');
        navigate('/');
        setSystemAlert({
          type: 'success',
          message: `Đăng ký thành công tài khoản Khách Hàng: ${usr.username}! Chào mừng bạn đến với SmartChain.`,
        });
        setTimeout(() => setSystemAlert(null), 5000);
      } else {
        setAuthError(res?.message || 'Đăng ký tài khoản thất bại.');
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || err.message || 'Lỗi khi tạo tài khoản khách hàng!');
    } finally {
      setAuthLoading(false);
    }
  };

  // Đăng nhập người dùng bằng Google Gmail
  const handleGoogleSignIn = async (googlePayload = {}) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await googleSignInApi(googlePayload);
      if (res && res.token) {
        setJwtToken(res.token);
        localStorage.setItem('smartchain_jwt_token', res.token);

        const email = res.email || googlePayload.email || '';
        const usr = {
          userId: res.userId,
          username: res.username || email.split('@')[0],
          fullName: res.fullName || googlePayload.name || 'Khách Hàng Google',
          role: 'CONSUMER',
          department: res.department || 'Public Consumer',
          phone: email,
          picture: res.picture || googlePayload.picture || '',
          assignedEntity: 'Xác thực Google Gmail Chính Chủ',
          authProvider: 'GOOGLE_GMAIL',
          createdAt: res.createdAt,
        };
        setCurrentUser(usr);
        localStorage.setItem('smartchain_user', JSON.stringify(usr));

        const matchingActor = RBAC_ACTORS.find((r) => r.role === 'CONSUMER') || RBAC_ACTORS[7];
        setActiveRole(matchingActor);
        setActiveTab('overview');
        navigate('/');
        setSystemAlert({
          type: 'success',
          message: `Đăng nhập thành công với Google Gmail (${email})! Chào mừng ${usr.fullName} đến với Cổng người tiêu dùng SmartChain.`,
        });
        setTimeout(() => setSystemAlert(null), 5000);
      } else {
        setAuthError(res?.message || 'Đăng nhập Google thất bại');
      }
    } catch (err) {
      console.error('Lỗi đăng nhập Google Gmail:', err);
      setAuthError(err.response?.data?.message || 'Không thể kết nối đến máy chủ xác thực Google!');
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('smartchain_jwt_token');
    localStorage.removeItem('smartchain_user');
    setCurrentUser(null);
    setJwtToken('');
    setAuthError('');
    setShowUserProfileModal(false);
    navigate('/');
    setSystemAlert({
      type: 'warning',
      message: 'Đã đăng xuất khỏi hệ thống an toàn.',
    });
    setTimeout(() => setSystemAlert(null), 4000);
  };

  // Search handler: Lọc danh sách lô hàng theo từ khóa tìm kiếm trên trang Tổng Quan
  const handleExecuteSearch = (query) => {
    const q = (query !== undefined ? query : searchQuery || '').trim();
    if (!q) {
      setSearchQuery('');
      return;
    }
    setSearchQuery(q);
    setSearchHistory((prev) => {
      const next = [q, ...prev.filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 8);
      try { localStorage.setItem('smartchain_search_history', JSON.stringify(next)); } catch (e) {}
      return next;
    });
    setIsSearchHistoryOpen(false);

    // Nếu đang ở trang Tổng quan, hiển thị danh sách các lô khớp từ khóa (thoát chế độ chi tiết 1 lô nếu đang mở)
    if (activeTab === 'overview') {
      if (selectedBatch) {
        setSelectedBatch(null);
      }
      return;
    }

    const matched = accessibleBatches.find(
      (b) =>
        b.batch_code?.toLowerCase().includes(q.toLowerCase()) ||
        b.product_name?.toLowerCase().includes(q.toLowerCase()) ||
        b.transport_vehicle_plate?.toLowerCase().includes(q.toLowerCase()) ||
        b.farm_origin?.toLowerCase().includes(q.toLowerCase())
    );
    if (matched) {
      setSelectedBatch(matched);
      setSystemAlert({
        type: 'success',
        message: `Đã tìm thấy và chuyển sang lô: ${matched.batch_code} (${matched.product_name})`,
      });
      setTimeout(() => setSystemAlert(null), 4000);
    } else {
      setSystemAlert({
        type: 'warning',
        message: `Không tìm thấy lô hàng nào khớp với từ khóa "${q}".`,
      });
      setTimeout(() => setSystemAlert(null), 4000);
    }
  };

  const handleClearSearchHistory = () => {
    setSearchHistory([]);
    try { localStorage.removeItem('smartchain_search_history'); } catch (e) {}
  };

  // User Management Handlers
  const loadEnterpriseUsers = async () => {
    try {
      const users = await fetchAllUsers();
      if (Array.isArray(users)) {
        setEnterpriseUsersList(users);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách người dùng:', err.message);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && (activeTab === 'admin' || activeTab === 'users' || activeTab === 'iot')) {
      loadEnterpriseUsers();
    }
  }, [currentUser, activeTab]);

  const handleCreateEnterpriseUser = async (e) => {
    e.preventDefault();
    if (!newEnterpriseUsername.trim() || !newEnterprisePassword.trim()) {
      setSystemAlert({ type: 'warning', message: 'Tên đăng nhập và mật khẩu không được để trống!' });
      return;
    }
    try {
      const res = await registerUser({
        username: newEnterpriseUsername.trim(),
        password: newEnterprisePassword.trim(),
        fullName: newEnterpriseFullName.trim() || newEnterpriseUsername.trim(),
        department: newEnterpriseDept.trim() || 'Doanh Nghiệp',
        role: newEnterpriseRole,
        phone: newEnterprisePhone.trim(),
        identityCard: newEnterpriseIdentityCard.trim(),
        assignedEntity: newEnterpriseAssignedEntity.trim(),
        notes: newEnterpriseNotes.trim(),
      });
      setSystemAlert({
        type: 'success',
        message: `Đã cấp phát thành công tài khoản Doanh nghiệp: ${res.username} (${res.role})!`,
      });
      setTimeout(() => setSystemAlert(null), 6000);
      setNewEnterpriseUsername('');
      setNewEnterpriseFullName('');
      setNewEnterprisePassword('');
      setNewEnterprisePhone('');
      setNewEnterpriseIdentityCard('');
      setNewEnterpriseAssignedEntity('');
      setNewEnterpriseNotes('');
      loadEnterpriseUsers();
    } catch (err) {
      setSystemAlert({
        type: 'danger',
        message: `Lỗi cấp phát tài khoản: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  const handleUpdateUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserDetail?.userId) return;
    try {
      await updateUser(selectedUserDetail.userId, {
        fullName: selectedUserDetail.fullName,
        department: selectedUserDetail.department,
        role: selectedUserDetail.role,
        phone: selectedUserDetail.phone,
        identityCard: selectedUserDetail.identityCard,
        assignedEntity: selectedUserDetail.assignedEntity,
        notes: selectedUserDetail.notes,
        password: selectedUserDetail.newPassword || '',
        isActive: String(selectedUserDetail.isActive),
      });
      setSystemAlert({
        type: 'success',
        message: `Đã cập nhật thành công hồ sơ tài khoản: ${selectedUserDetail.username}!`,
      });
      setTimeout(() => setSystemAlert(null), 5000);
      setSelectedUserDetail(null);
      loadEnterpriseUsers();
    } catch (err) {
      setSystemAlert({
        type: 'danger',
        message: `Lỗi cập nhật tài khoản: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  const handleDeleteUserSubmit = async (userId, username) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản "${username}" không?`)) return;
    try {
      await deleteUser(userId);
      setSystemAlert({
        type: 'success',
        message: `Đã xóa tài khoản "${username}" thành công!`,
      });
      setTimeout(() => setSystemAlert(null), 5000);
      setSelectedUserDetail(null);
      loadEnterpriseUsers();
    } catch (err) {
      setSystemAlert({
        type: 'danger',
        message: `Lỗi xóa tài khoản: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  const handleToggleUserStatus = async (user) => {
    const nextStatus = !user.isActive;
    try {
      await toggleUserStatus(user.userId, nextStatus);
      setSystemAlert({
        type: 'success',
        message: `Đã ${nextStatus ? 'mở khóa' : 'khóa'} thành công tài khoản ${user.username}!`,
      });
      setTimeout(() => setSystemAlert(null), 4000);
      loadEnterpriseUsers();
    } catch (err) {
      setSystemAlert({
        type: 'danger',
        message: `Lỗi cập nhật trạng thái tài khoản: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  // IoT & Operations Handlers
  const handleToggleRelay = async () => {
    const nextAction = relayState ? 'COOLING_OFF' : 'COOLING_ON';
    try {
      const res = await sendRelayCommand('ESP32-MULTI-01', nextAction, 'Cưỡng bức hạ nhiệt độ thủ công từ Dashboard');
      setRelayState(!relayState);
      setSystemAlert(`Đã gửi lệnh Relay GPIO 14: ${nextAction} (${res.message || 'Thành công'})`);
      setTimeout(() => setSystemAlert(null), 4000);
    } catch (err) {
      setSystemAlert(`Lỗi gửi lệnh Relay: ${err.message}`);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    const payload = {
      categoryCode: newBatchCategory,
      productName: newBatchName.trim(),
      farmOrigin: newBatchFarm.trim(),
      weightKg: Number(newBatchWeight),
      transportVehiclePlate: newBatchVehicle.trim(),
      polymorphicMetadata: { ...newBatchPolyFields },
    };
    try {
      const created = await createFoodBatch(payload);
      setSystemAlert({
        type: 'success',
        message: `Tạo thành công Lô hàng ${created.batch_code} (${created.product_name}) & Đúc Genesis Block #0!`,
      });
      setTimeout(() => setSystemAlert(null), 6000);
      setNewBatchName('');
      setNewBatchFarm('');
      setNewBatchWeight('');
      setNewBatchVehicle('');
      refreshCoreData();
      setSelectedBatch(created);
      setActiveTab('batches');
    } catch (err) {
      setSystemAlert({
        type: 'danger',
        message: `Lỗi tạo lô hàng: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  const handleUpdateBatch = async (batchCode, payload) => {
    try {
      const updated = await updateFoodBatch(batchCode, payload);
      setSystemAlert({
        type: 'success',
        message: `Đã cập nhật thành công thông tin Lô hàng ${batchCode}!`,
      });
      setTimeout(() => setSystemAlert(null), 5000);
      await refreshCoreData();
      if (updated?.batch_code) {
        setSelectedBatch(updated);
      }
      return updated;
    } catch (err) {
      setSystemAlert({
        type: 'danger',
        message: `Lỗi cập nhật lô hàng: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  const handleGenerateDualQr = async () => {
    if (!selectedBatch?.batch_code) return;
    try {
      const res = await generateItemQrCodes(selectedBatch.batch_code, { quantity: Number(qrQuantity) });
      setGeneratedQrs(res);
      setSystemAlert(`Đã sinh ${res.total_items || qrQuantity} mã tem QR Kép cho lô ${selectedBatch.batch_code}!`);
      setTimeout(() => setSystemAlert(null), 5000);
    } catch (err) {
      setSystemAlert(`Lỗi sinh mã QR: ${err.message}`);
    }
  };

  const handleOtaSync = async () => {
    if (!selectedBatch?.batch_code) return;
    const batchTransport = selectedBatch?.transportJourney || selectedBatch?.transport_journey || {};
    const plate = (
      batchTransport.vehicle_plate ||
      selectedBatch?.transport_vehicle_plate ||
      selectedBatch?.vehiclePlate ||
      ''
    ).trim();
    if (!plate || plate.toUpperCase().includes('CHƯA')) {
      setSystemAlert({
        type: 'warning',
        message: `Lô hàng ${selectedBatch.batch_code} chưa được phân công xe lạnh! Vui lòng gán biển số xe trước khi nạp cấu hình OTA.`,
      });
      return;
    }
    try {
      const res = await syncIotProfileOta({
        batchCode: selectedBatch.batch_code,
        categoryCode: selectedBatch.category_code || selectedBatch.category,
        vehiclePlate: plate,
      });
      const isTransit = selectedBatch?.status === 'IN_TRANSIT';
      setSystemAlert({
        type: isTransit ? 'success' : 'warning',
        message: isTransit
          ? `OTA SYNC THÀNH CÔNG: Đã nạp Profile ${res.categoryCode || selectedBatch.category_code} của lô ${selectedBatch.batch_code} xuống ESP32 xe lạnh ${plate}!`
          : `ĐÃ NẠP CẤU HÌNH OTA XUỐNG ESP32 XE ${plate}: Thông số bảo quản lô ${selectedBatch.batch_code} đã nạp thành công vào phần cứng vi điều khiển (Wokwi OLED). Lưu ý: Lô hàng hiện ở trạng thái [${selectedBatch.status || 'CHỜ VẬN CHUYỂN'}], xe chưa khởi hành nên dữ liệu GPS và cảm biến thời gian thực trên bản đồ Dashboard sẽ bắt đầu phát trực tiếp khi tài xế bấm 'Bắt đầu hành trình'!`,
      });
      setTimeout(() => setSystemAlert(null), 8000);
    } catch (err) {
      setSystemAlert({
        type: 'danger',
        message: `Lỗi đồng bộ OTA: ${err.message}`,
      });
    }
  };

  const handleStartDriverTrip = async (batchCode = selectedBatch?.batch_code) => {
    try {
      const code = batchCode || selectedBatch?.batch_code;
      if (!code) return;
      const targetBatch = batches.find((b) => b.batch_code === code) || selectedBatch;
      const batchTransport = targetBatch?.transportJourney || targetBatch?.transport_journey || {};
      const plate =
        batchTransport.vehicle_plate ||
        targetBatch?.transport_vehicle_plate ||
        targetBatch?.vehiclePlate ||
        currentUser?.assignedEntity ||
        '';
      const driver =
        batchTransport.driver_name ||
        (currentUser?.role === 'LOGISTICS_DRIVER'
          ? currentUser?.fullName || currentUser?.username
          : '');

      const res = await startDriverTrip({
        batchCode: code,
        vehiclePlate: plate,
        driverName: driver,
      });
      setSystemAlert({
        type: 'success',
        message: `ĐÃ KHỞI HÀNH THÀNH CÔNG: Chuyến xe ${plate} (Tài xế ${driver}) chở lô ${code} đã bắt đầu lăn bánh! Cảm biến IoT đang kích hoạt.`,
      });
      refreshCoreData();
      return res;
    } catch (err) {
      const errDetail = err.response?.data?.message || err.message;
      setSystemAlert({
        type: 'danger',
        message: `Lỗi khởi hành chuyến xe: ${errDetail}`,
      });
    }
  };

  const handleCompleteDriverTrip = async (batchCode = selectedBatch?.batch_code) => {
    try {
      const code = batchCode || selectedBatch?.batch_code;
      if (!code) return;
      const targetBatch = batches.find((b) => b.batch_code === code) || selectedBatch;
      const batchTransport = targetBatch?.transportJourney || targetBatch?.transport_journey || {};
      const supermarket = batchTransport.destination_store || 'Siêu Thị Co.opmart Quận 7';
      const driver =
        batchTransport.driver_name ||
        (currentUser?.role === 'LOGISTICS_DRIVER'
          ? currentUser?.fullName || currentUser?.username
          : '');

      const res = await completeDriverTrip({
        batchCode: code,
        supermarketName: supermarket,
        driverName: driver,
      });
      setSystemAlert({
        type: 'success',
        message: `ĐÃ BÀN GIAO THÀNH CÔNG: Chuyến xe chở lô ${code} đã đến ${supermarket} an toàn!`,
      });
      refreshCoreData();
      return res;
    } catch (err) {
      setSystemAlert({
        type: 'danger',
        message: `Lỗi bàn giao chuyến xe: ${err.response?.data?.message || err.message}`,
      });
    }
  };

  const handleRunQcAudit = async () => {
    if (!selectedBatch?.batch_code) return;
    try {
      const res = await runQcAudit(selectedBatch.batch_code);
      setQcAuditResult(res);
    } catch (err) {
      setSystemAlert(`Lỗi kiểm toán QC: ${err.message}`);
    }
  };

  const handleApproveQc = async (decision) => {
    if (!selectedBatch?.batch_code) return;
    try {
      const res = await approveQcGate(selectedBatch.batch_code, {
        decision,
        inspectorNotes: qcSignatureNote,
      });
      setSystemAlert(`Smart Contract: Đã ký duyệt ${decision} lô hàng ${selectedBatch.batch_code}! Hash: ${res.txHash || 'ECDSA-OK'}`);
      setTimeout(() => setSystemAlert(null), 7000);
      handleRunQcAudit();
      refreshCoreData();
    } catch (err) {
      setSystemAlert(`Lỗi ký duyệt Smart Contract: ${err.message}`);
    }
  };

  const handleStockShelf = async () => {
    if (!selectedBatch?.batch_code) return;
    try {
      await stockShelfFefo(selectedBatch.batch_code, 'KE-THUC-PHAM-A1');
      setSystemAlert(`Đã nhập lô ${selectedBatch.batch_code} vào Kệ Kép FEFO (Redis ZSET)!`);
      setTimeout(() => setSystemAlert(null), 5000);
      refreshCoreData();
    } catch (err) {
      setSystemAlert(`Lỗi nhập kệ FEFO: ${err.message}`);
    }
  };

  const handlePosCheckout = async (codeToPay) => {
    const code = codeToPay || posSerialInput;
    if (!code) return;
    try {
      const res = await posCheckout(code, activeRole.role);
      setPosCheckoutResult(res);
      if (res.status === 200) {
        setSystemAlert(`POS CHECKOUT THÀNH CÔNG: Tem ${code} đã bán & hủy tem hợp lệ.`);
      } else if (res.status === 409) {
        setSystemAlert(`CHỐNG GIAN LẬN REDLOCK: Tem ${code} đã bán trước đó! Từ chối thanh toán.`);
      }
      setTimeout(() => setSystemAlert(null), 7000);
      refreshCoreData();
    } catch (err) {
      setPosCheckoutResult({ status: 500, data: { message: err.message } });
    }
  };

  const handleEmergencyRecall = async () => {
    if (!selectedBatch?.batch_code) return;
    try {
      const res = await triggerEmergencyRecall(selectedBatch.batch_code, recallReason);
      setRecallResult(res);
      setSystemAlert(`ĐÃ KÍCH HOẠT LỆNH THU HỒI KHẨN CẤP TOÀN HỆ THỐNG (${res.executionTimeMs || '<0.02'}s)!`);
      setTimeout(() => setSystemAlert(null), 8000);
      refreshCoreData();
    } catch (err) {
      setSystemAlert(`Lỗi thu hồi khẩn cấp: ${err.message}`);
    }
  };

  // Dynamic Telemetry Metrics & TTI
  const selectedProfile = profiles.find((p) => p.categoryCode === selectedBatch?.category_code);
  const currentTemp = Number(latestTelemetry?.temperature ?? latestTelemetry?.temp ?? 9.5);
  const currentGas = Number(latestTelemetry?.gas_ppm ?? latestTelemetry?.gas_value ?? latestTelemetry?.gasPpm ?? 0.0);
  const minAllowedTemp = Number(selectedProfile?.minTemp ?? 8.0);
  const maxAllowedTemp = Number(selectedProfile?.maxTemp ?? 12.0);
  const maxAllowedGas = Number(selectedProfile?.maxGas ?? 30.0);
  const currentCategory = selectedProfile?.categoryCode ?? 'VEG_FRUIT';

  let tempCompliancePct = 100;
  if (currentTemp > maxAllowedTemp) {
    tempCompliancePct = Math.max(10, Math.round(100 - (currentTemp - maxAllowedTemp) * 9));
  } else if (currentTemp < minAllowedTemp) {
    tempCompliancePct = Math.max(10, Math.round(100 - (minAllowedTemp - currentTemp) * 12));
  }

  let gasSafetyPct = 100;
  if (maxAllowedGas > 0) {
    if (currentGas <= maxAllowedGas) {
      gasSafetyPct = Math.max(40, Math.round(100 - (currentGas / maxAllowedGas) * 20));
    } else {
      gasSafetyPct = Math.max(0, Math.round(100 - (currentGas / maxAllowedGas) * 65));
    }
  }

  const breachCount = (telemetryList || []).filter(
    (t) => t.is_breached || (t.alert_status && t.alert_status !== 'NORMAL')
  ).length;
  const isCurrentBreached = Boolean(
    latestTelemetry?.is_breached ||
    (latestTelemetry?.alert_status && latestTelemetry?.alert_status !== 'NORMAL') ||
    currentTemp > maxAllowedTemp ||
    currentTemp < minAllowedTemp ||
    (maxAllowedGas > 0 && currentGas > maxAllowedGas)
  );

  let calculatedTti = 98.5;
  calculatedTti -= Math.min(30, breachCount * 2.0);
  if (isCurrentBreached) {
    if (currentTemp > maxAllowedTemp) calculatedTti -= (currentTemp - maxAllowedTemp) * 1.8;
    if (currentTemp < minAllowedTemp && currentCategory === 'VEG_FRUIT') calculatedTti -= (minAllowedTemp - currentTemp) * 2.5;
    if (currentGas > maxAllowedGas) calculatedTti -= ((currentGas - maxAllowedGas) / maxAllowedGas) * 16;
  }
  calculatedTti = Math.max(30.0, Math.min(100.0, Math.round(calculatedTti * 10) / 10));

  const ttiDisplay = `${calculatedTti.toFixed(1)}%`;
  const ttiDelta = calculatedTti >= 90 ? 'Tối ưu' : calculatedTti >= 75 ? 'Khá' : calculatedTti >= 60 ? 'Cần chú ý' : 'Nguy cơ hủy';
  const tempStatusText = currentTemp > maxAllowedTemp ? 'Quá nhiệt' : currentTemp < minAllowedTemp ? 'Tổn thương lạnh' : 'An toàn';
  const gasStatusText = (maxAllowedGas > 0 && currentGas > maxAllowedGas) ? 'Vượt ngưỡng' : 'Ổn định';

  const userRole = currentUser?.role || 'CONSUMER';
  const allowedTabIds = ROLE_ALLOWED_TABS[userRole] || ['overview', 'trace'];
  const NAV_ITEMS = [
    { id: 'overview', label: 'Tổng Quan', icon: Grid },
    { id: 'batches', label: 'Lô hàng & QR kép', icon: Layers, badge: batches.length },
    { id: 'iot', label: 'Xe lạnh & IoT', icon: Truck, badge: 'Live' },
    { id: 'qc', label: 'Cổng KCS & TTI', icon: CheckSquare },
    { id: 'shelf', label: 'Kệ FEFO & POS', icon: ShoppingCart },
    { id: 'trace', label: 'Minh bạch & Recall', icon: ShieldCheck },
    { id: 'users', label: 'Cấp phát tài khoản', icon: UserCheck },
    { id: 'admin', label: 'Quản lý hệ thống', icon: Database },
  ].filter((item) => allowedTabIds.includes(item.id));

  useEffect(() => {
    if (currentUser && !allowedTabIds.includes(activeTab)) {
      setActiveTab(allowedTabIds[0] || 'overview');
    }
  }, [currentUser, activeTab, allowedTabIds]);

  // Tự động chuyển về trang chủ nếu đã đăng nhập thành công
  useEffect(() => {
    if (
      currentUser &&
      jwtToken &&
      (location.pathname.includes('/login') ||
        location.pathname === '/login' ||
        location.pathname === '/register')
    ) {
      navigate('/', { replace: true });
    }
  }, [currentUser, jwtToken, location.pathname, navigate]);

  // Bắt buộc đăng nhập: Nếu chưa có phiên đăng nhập hợp lệ -> Hiển thị AuthPages
  if (!currentUser || !jwtToken) {
    return (
      <AuthPages
        location={location}
        navigate={navigate}
        authError={authError}
        setAuthError={setAuthError}
        authLoading={authLoading}
        authView={authView}
        setAuthView={setAuthView}
        authUsername={authUsername}
        setAuthUsername={setAuthUsername}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authFullName={authFullName}
        setAuthFullName={setAuthFullName}
        authPhone={authPhone}
        setAuthPhone={setAuthPhone}
        authConfirmPassword={authConfirmPassword}
        setAuthConfirmPassword={setAuthConfirmPassword}
        enterpriseLoginRole={enterpriseLoginRole}
        setEnterpriseLoginRole={setEnterpriseLoginRole}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        handleLoginSubmit={handleLoginSubmit}
        handleRegisterSubmit={handleRegisterConsumer}
        handleGoogleSignIn={handleGoogleSignIn}
      />
    );
  }

  // Nếu là tài khoản Khách Hàng Tiêu Dùng (CONSUMER) -> Vào Cổng Khách Hàng riêng biệt
  if (currentUser.role === 'CONSUMER') {
    return (
      <ConsumerPortalPage
        currentUser={currentUser}
        handleLogout={handleLogout}
        batches={batches}
        selectedBatch={selectedBatch}
        setSelectedBatch={setSelectedBatch}
        isDark={isDark}
        handleToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FBF9F7] text-[#1A1A1A] antialiased selection:bg-[#F95716] selection:text-white dark:bg-[#120D0A] dark:text-[#F5F5F5]">
      {/* Sidebar */}
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        navItems={NAV_ITEMS}
        currentUser={currentUser}
        setShowUserProfileModal={setShowUserProfileModal}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop Header */}
        <DesktopHeader
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchHistory={searchHistory}
          isSearchHistoryOpen={isSearchHistoryOpen}
          setIsSearchHistoryOpen={setIsSearchHistoryOpen}
          handleExecuteSearch={handleExecuteSearch}
          handleClearSearchHistory={handleClearSearchHistory}
          batches={accessibleBatches}
          selectedBatch={selectedBatch}
          setSelectedBatch={setSelectedBatch}
          currentUser={currentUser}
          setShowUserProfileModal={setShowUserProfileModal}
          handleLogout={handleLogout}
          isDark={isDark}
          handleToggleTheme={handleToggleTheme}
        />

        {/* Global System Alert Banner */}
        {systemAlert && (
          <div
            className={`mx-6 mt-4 flex items-center justify-between gap-3 rounded-2xl px-5 py-3 text-sm font-semibold shadow-md transition-all ${
              typeof systemAlert === 'object' && systemAlert.type === 'danger'
                ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-400'
                : typeof systemAlert === 'object' && systemAlert.type === 'warning'
                ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400'
                : 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{typeof systemAlert === 'string' ? systemAlert : systemAlert.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSystemAlert(null)}
              className="text-xs font-bold opacity-75 hover:opacity-100"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Tab Content Display */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          {activeTab === 'overview' && (
            <OverviewPage
              batches={accessibleBatches}
              selectedBatch={selectedBatch}
              onSelectBatch={setSelectedBatch}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedProfile={selectedProfile}
              latestTelemetry={latestTelemetry}
              telemetryList={telemetryList}
              relayState={relayState}
              handleToggleRelay={handleToggleRelay}
              handleOtaSync={handleOtaSync}
              setActiveTab={setActiveTab}
              blockchainVerification={blockchainVerification}
              isDark={isDark}
              tempCompliancePct={tempCompliancePct}
              gasSafetyPct={gasSafetyPct}
              calculatedTti={calculatedTti}
              currentTemp={currentTemp}
              currentGas={currentGas}
              minAllowedTemp={minAllowedTemp}
              maxAllowedTemp={maxAllowedTemp}
              maxAllowedGas={maxAllowedGas}
              ttiDisplay={ttiDisplay}
              ttiDelta={ttiDelta}
              tempStatusText={tempStatusText}
              gasStatusText={gasStatusText}
              getCassandraCsvExportUrl={getCassandraCsvExportUrl}
            />
          )}

          {activeTab === 'batches' && (
            <BatchesPage
              batches={accessibleBatches}
              onSelectBatch={setSelectedBatch}
              currentUser={currentUser}
              handleCreateBatch={handleCreateBatch}
              handleUpdateBatch={handleUpdateBatch}
              newBatchCategory={newBatchCategory}
              setNewBatchCategory={setNewBatchCategory}
              newBatchName={newBatchName}
              setNewBatchName={setNewBatchName}
              newBatchFarm={newBatchFarm}
              setNewBatchFarm={setNewBatchFarm}
              newBatchWeight={newBatchWeight}
              setNewBatchWeight={setNewBatchWeight}
              newBatchVehicle={newBatchVehicle}
              setNewBatchVehicle={setNewBatchVehicle}
              newBatchPolyFields={newBatchPolyFields}
              setNewBatchPolyFields={setNewBatchPolyFields}
              selectedBatch={selectedBatch}
              qrQuantity={qrQuantity}
              setQrQuantity={setQrQuantity}
              handleGenerateDualQr={handleGenerateDualQr}
              generatedQrs={generatedQrs}
              handleOtaSync={handleOtaSync}
              foodCategories={FOOD_CATEGORIES}
              refreshCoreData={refreshCoreData}
            />
          )}

          {activeTab === 'iot' && (
            <ColdChainIotPage
              latestTelemetry={latestTelemetry}
              selectedBatch={selectedBatch}
              selectedProfile={selectedProfile}
              telemetryList={telemetryList}
              isDark={isDark}
              currentTemp={currentTemp}
              currentGas={currentGas}
              tempStatusText={tempStatusText}
              relayState={relayState}
              handleToggleRelay={handleToggleRelay}
              handleOtaSync={handleOtaSync}
              handleStartDriverTrip={handleStartDriverTrip}
              handleCompleteDriverTrip={handleCompleteDriverTrip}
              currentUser={currentUser}
              batches={accessibleBatches}
              onSelectBatch={setSelectedBatch}
              refreshCoreData={refreshCoreData}
              enterpriseUsersList={enterpriseUsersList}
              setSystemAlert={setSystemAlert}
            />
          )}

          {activeTab === 'qc' && (
            <QcInspectionPage
              batches={accessibleBatches}
              onSelectBatch={setSelectedBatch}
              currentUser={currentUser}
              selectedBatch={selectedBatch}
              handleRunQcAudit={handleRunQcAudit}
              qcAuditResult={qcAuditResult}
              calculatedTti={calculatedTti}
              qcSignatureNote={qcSignatureNote}
              setQcSignatureNote={setQcSignatureNote}
              handleApproveQc={handleApproveQc}
            />
          )}

          {activeTab === 'shelf' && (
            <ShelfFefoPosPage
              batches={accessibleBatches}
              selectedBatch={selectedBatch}
              onSelectBatch={setSelectedBatch}
              currentUser={currentUser}
              scannerActive={scannerActive}
              setScannerActive={setScannerActive}
              posSerialInput={posSerialInput}
              setPosSerialInput={setPosSerialInput}
              handlePosCheckout={handlePosCheckout}
              posCheckoutResult={posCheckoutResult}
              handleStockShelf={handleStockShelf}
              fefoQueues={fefoQueues}
            />
          )}

          {activeTab === 'trace' && (
            <BlockchainTracePage
              batches={accessibleBatches}
              onSelectBatch={setSelectedBatch}
              currentUser={currentUser}
              selectedBatch={selectedBatch}
              recallReason={recallReason}
              setRecallReason={setRecallReason}
              handleEmergencyRecall={handleEmergencyRecall}
              recallResult={recallResult}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementPage
              userFilterRole={userFilterRole}
              setUserFilterRole={setUserFilterRole}
              userSearchQuery={userSearchQuery}
              setUserSearchQuery={setUserSearchQuery}
              enterpriseUsersList={enterpriseUsersList}
              setSelectedUserDetail={setSelectedUserDetail}
              loadEnterpriseUsers={loadEnterpriseUsers}
              newEnterpriseRole={newEnterpriseRole}
              setNewEnterpriseRole={setNewEnterpriseRole}
              newEnterpriseUsername={newEnterpriseUsername}
              setNewEnterpriseUsername={setNewEnterpriseUsername}
              newEnterprisePassword={newEnterprisePassword}
              setNewEnterprisePassword={setNewEnterprisePassword}
              newEnterpriseFullName={newEnterpriseFullName}
              setNewEnterpriseFullName={setNewEnterpriseFullName}
              newEnterprisePhone={newEnterprisePhone}
              setNewEnterprisePhone={setNewEnterprisePhone}
              newEnterpriseIdentityCard={newEnterpriseIdentityCard}
              setNewEnterpriseIdentityCard={setNewEnterpriseIdentityCard}
              newEnterpriseAssignedEntity={newEnterpriseAssignedEntity}
              setNewEnterpriseAssignedEntity={setNewEnterpriseAssignedEntity}
              newEnterpriseNotes={newEnterpriseNotes}
              setNewEnterpriseNotes={setNewEnterpriseNotes}
              handleCreateEnterpriseUser={handleCreateEnterpriseUser}
            />
          )}

          {activeTab === 'admin' && (
            <AdminSystemPage
              batches={batches}
              telemetryList={telemetryList}
              getCassandraCsvExportUrl={getCassandraCsvExportUrl}
              getMongoJsonExportUrl={getMongoJsonExportUrl}
              foodCategories={FOOD_CATEGORIES}
            />
          )}
        </main>
      </div>

      {/* User Personal Profile Modal */}
      <UserProfileModal
        showUserProfileModal={showUserProfileModal}
        setShowUserProfileModal={setShowUserProfileModal}
        currentUser={currentUser}
        handleLogout={handleLogout}
      />

      {/* Admin User Detail & Edit Modal */}
      <UserDetailModal
        selectedUserDetail={selectedUserDetail}
        setSelectedUserDetail={setSelectedUserDetail}
        handleToggleStatus={handleToggleUserStatus}
        handleDeleteEnterpriseUser={handleDeleteUserSubmit}
        handleSaveUserDetail={handleUpdateUserSubmit}
      />
    </div>
  );
}
