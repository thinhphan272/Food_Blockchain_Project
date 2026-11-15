import axios from 'axios';

const resolveDefaultApiBase = () => {
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, origin } = window.location;
    // 1. Khi truy cap qua Cloudflare Tunnel, Ngrok, Localtunnel hoac Public Domain
    if (hostname && hostname !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `${origin}/api/v1`;
    }
    // 2. Khi truy cap qua mang Wi-Fi / IP LAN (vi du: 192.168.1.17 hoac 172.20.10.x)
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:8080/api/v1`;
    }
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
};

const API_BASE_URL = resolveDefaultApiBase();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  // Dam bao tren dien thoai URL luon dong bo theo domain hien tai
  config.baseURL = resolveDefaultApiBase();
  const token = localStorage.getItem('smartchain_jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 1. Authentication & RBAC (MySQL)
export const loginUser = async (username, password) => {
  const res = await apiClient.post('/auth/login', { username, password });
  if (res.data?.token) {
    localStorage.setItem('smartchain_jwt_token', res.data.token);
  }
  return res.data;
};

export const registerUser = async (payload) => {
  const res = await apiClient.post('/auth/register', payload);
  if (res.data?.token) {
    localStorage.setItem('smartchain_jwt_token', res.data.token);
  }
  return res.data;
};

export const googleSignInApi = async (email, name = '', phone = '') => {
  const res = await apiClient.post('/auth/google', { email, name, phone });
  if (res.data?.token) {
    localStorage.setItem('smartchain_jwt_token', res.data.token);
  }
  return res.data;
};

export const toggleUserStatus = async (userId, isActive) => {
  const res = await apiClient.patch(`/auth/users/${userId}/status`, { isActive });
  return res.data;
};

export const updateUser = async (userId, payload) => {
  const res = await apiClient.put(`/auth/users/${userId}`, payload);
  return res.data;
};

export const deleteUser = async (userId) => {
  const res = await apiClient.delete(`/auth/users/${userId}`);
  return res.data;
};

export const changeUserPassword = async (payload) => {
  const res = await apiClient.post('/auth/change-password', payload);
  return res.data;
};

export const fetchAllUsers = async () => {
  const res = await apiClient.get('/auth/users');
  return res.data;
};

export const fetchAllRoles = async () => {
  const res = await apiClient.get('/auth/roles');
  return res.data;
};

// 2. Storage Profiles (MySQL & Redis)
export const fetchStorageProfiles = async () => {
  const res = await apiClient.get('/profiles');
  return res.data;
};

export const createStorageProfile = async (payload) => {
  const res = await apiClient.post('/profiles', payload);
  return res.data;
};

export const updateStorageProfile = async (categoryCode, payload) => {
  const res = await apiClient.put(`/profiles/${categoryCode}`, payload);
  return res.data;
};

export const deleteStorageProfile = async (categoryCode) => {
  const res = await apiClient.delete(`/profiles/${categoryCode}`);
  return res.data;
};

// 3. Batches & QR Serialization
export const fetchAllBatches = async () => {
  const res = await apiClient.get('/batches');
  return res.data;
};

export const createFoodBatch = async (payload) => {
  const res = await apiClient.post('/batches', payload);
  return res.data;
};

export const updateFoodBatch = async (batchCode, payload) => {
  const res = await apiClient.put(`/batches/${batchCode}`, payload);
  return res.data;
};

export const generateItemQrCodes = async (batchCode, payload) => {
  const res = await apiClient.post(`/batches/${batchCode}/generate-qr`, payload);
  return res.data;
};

export const getBatchScanHistory = async (batchCode) => {
  const res = await apiClient.get(`/batches/${batchCode}/scan-history`);
  return res.data;
};

// 4. Logistics, Telemetry & OTA Sync
export const fetchDriverTrips = async (vehiclePlate = '49C-567.89') => {
  const res = await apiClient.get('/driver/trips', { params: { vehiclePlate } });
  return res.data;
};

export const assignBatchToDriver = async (payload) => {
  const res = await apiClient.post('/driver/assign-batch', payload);
  return res.data;
};

export const revokeBatchAssignment = async (batchCode) => {
  const res = await apiClient.post('/driver/revoke-batch', { batchCode });
  return res.data;
};

export const respondToBatchAssignment = async (payload) => {
  const res = await apiClient.post('/driver/respond-batch', payload);
  return res.data;
};

export const requestDoorOpen = async (payload) => {
  const res = await apiClient.post('/driver/request-door-open', payload);
  return res.data;
};

export const approveDoorOpen = async (payload) => {
  const res = await apiClient.post('/driver/approve-door-open', payload);
  return res.data;
};

export const openTruckDoor = async (payload) => {
  const res = await apiClient.post('/driver/open-door', payload);
  return res.data;
};

export const startDriverTrip = async (payload) => {
  const res = await apiClient.post('/driver/start-trip', payload);
  return res.data;
};

export const completeDriverTrip = async (payload) => {
  const res = await apiClient.post('/driver/complete-trip', payload);
  return res.data;
};

export const resetDriverTrip = async (batchCode = 'LOT-VEG-2026-001') => {
  const res = await apiClient.post('/driver/reset-trip', { batchCode });
  return res.data;
};

export const syncIotProfileOta = async (payload) => {
  const res = await apiClient.post('/iot/sync-profile', payload);
  return res.data;
};

export const triggerIotScenario = async (scenarioMode) => {
  const res = await apiClient.post(`/iot/scenario/${scenarioMode}`);
  return res.data;
};

export const sendRelayCommand = async (deviceId, action, reason) => {
  const res = await apiClient.post('/iot/command', { deviceId, action, reason });
  return res.data;
};

export const fetchTelemetryByBatch = async (batchCode) => {
  const res = await apiClient.get(`/telemetry/${batchCode}`);
  return res.data;
};

export const fetchLatestTelemetry = async (batchCode) => {
  const res = await apiClient.get(`/telemetry/latest/${batchCode}`);
  return res.data;
};

export const verifyBlockchainIntegrity = async (batchCode) => {
  const res = await apiClient.get(`/blockchain/verify/${batchCode}`);
  return res.data;
};

// 5. Inbound QC Audit & AI TTI Engine
export const runQcAudit = async (batchCode) => {
  const res = await apiClient.get(`/qc/audit/${batchCode}`);
  return res.data;
};

export const approveQcGate = async (batchCode, payload) => {
  const res = await apiClient.post(`/qc/approve/${batchCode}`, payload);
  return res.data;
};

// 6. Shelf Allocation & POS Checkout
export const stockShelfFefo = async (batchCode, shelfName) => {
  const res = await apiClient.post(`/shelf/stock/${batchCode}`, { shelfName });
  return res.data;
};

export const fetchFefoQueues = async () => {
  const res = await apiClient.get('/shelf/fefo');
  return res.data;
};

export const posCheckout = async (serialCode, cashierId) => {
  try {
    const res = await apiClient.post('/pos/checkout', { serialCode, cashierId });
    return { status: res.status, data: res.data };
  } catch (err) {
    if (err.response) {
      return { status: err.response.status, data: err.response.data };
    }
    throw err;
  }
};

export const posCheckoutWithRedlock = posCheckout;

// 7. Traceability & Emergency Recall
export const traceByCode = async (code) => {
  const res = await apiClient.get(`/trace/${encodeURIComponent(code)}`);
  return res.data;
};

export const triggerEmergencyRecall = async (batchCode, reason) => {
  const res = await apiClient.post('/admin/recall', { batchCode, reason });
  return res.data;
};

// 8. Polyglot Metrics & Data Export
export const fetchNoSqlOverview = async () => {
  const res = await apiClient.get('/nosql/overview');
  return res.data;
};

export const getCassandraCsvExportUrl = () => `${API_BASE_URL}/nosql/export/cassandra`;
export const getMongoJsonExportUrl = () => `${API_BASE_URL}/nosql/export/mongodb`;
