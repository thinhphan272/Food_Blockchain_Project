export const DEFAULT_API_BASE =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  'http://localhost:8080/api/v1';

// 1. Xác thực đăng nhập
export async function loginMobile(apiBaseUrl, username, password) {
  const res = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: (username || '').trim(),
      password: (password || '').trim(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.message || 'Đăng nhập không thành công');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

// 2. Đăng ký tài khoản Khách hàng người tiêu dùng
export async function registerMobileConsumer(apiBaseUrl, { username, password, fullName, phone }) {
  const res = await fetch(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: (username || '').trim(),
      password: (password || '').trim(),
      fullName: (fullName || username || '').trim(),
      role: 'CONSUMER',
      department: 'Khách Hàng Tiêu Dùng Mobile',
      phone: (phone || '').trim(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.message || 'Đăng ký không thành công');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

// 3. Tra cứu nguồn gốc tem QR / Lô hàng
export async function fetchTraceData(apiBaseUrl, code) {
  const res = await fetch(`${apiBaseUrl}/trace/${encodeURIComponent(code)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// 4. Kiểm toán KCS lô hàng
export async function fetchQcAuditData(apiBaseUrl, batchCode) {
  const res = await fetch(`${apiBaseUrl}/qc/audit/${encodeURIComponent(batchCode)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// 5. Thanh toán quầy POS và hủy tem QR
export async function performPosCheckout(apiBaseUrl, serialCode, token = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${apiBaseUrl}/pos/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ serialCode, cashierId: 'MOBILE-POS-01' }),
  });
  const data = await res.json();
  return { httpCode: res.status, ...data };
}

// 6. Lấy dữ liệu vi khí hậu IoT của xe lạnh
export async function fetchTelemetryByBatch(apiBaseUrl, batchCode) {
  const res = await fetch(`${apiBaseUrl}/iot/telemetry/${encodeURIComponent(batchCode)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// 7. Lấy danh sách các lô hàng trên hệ thống
export async function fetchAllBatchesMobile(apiBaseUrl) {
  const res = await fetch(`${apiBaseUrl}/batches`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// 8. Tài xế xác nhận Nhận lô (ACCEPT) hoặc Từ chối (REJECT)
export async function respondToBatchAssignmentMobile(apiBaseUrl, payload) {
  const res = await fetch(`${apiBaseUrl}/driver/respond-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Lỗi phản hồi phân công lô hàng');
  return data;
}

// 9. Tài xế bắt đầu chuyến xe
export async function startDriverTripMobile(apiBaseUrl, payload) {
  const res = await fetch(`${apiBaseUrl}/driver/start-trip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Lỗi bắt đầu chuyến xe');
  return data;
}

// 10. Tài xế hoàn thành chuyến xe
export async function completeDriverTripMobile(apiBaseUrl, payload) {
  const res = await fetch(`${apiBaseUrl}/driver/complete-trip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Lỗi hoàn thành chuyến xe');
  return data;
}

// 11. Tài xế gửi yêu cầu mở cửa khẩn cấp đến Admin
export async function requestDoorOpenMobile(apiBaseUrl, payload) {
  const res = await fetch(`${apiBaseUrl}/driver/request-door-open`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Lỗi gửi yêu cầu mở cửa');
  return data;
}

// 12. Tài xế mở cửa hoặc đóng cửa thùng xe
export async function openTruckDoorMobile(apiBaseUrl, payload) {
  const res = await fetch(`${apiBaseUrl}/driver/open-door`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Lỗi thao tác cửa thùng xe');
  return data;
}
