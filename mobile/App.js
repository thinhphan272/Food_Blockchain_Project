import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

// Modular Theme & Services
import { getThemeTokens } from './src/theme/colors';
import {
  DEFAULT_API_BASE,
  fetchTraceData,
  fetchQcAuditData,
  performPosCheckout,
} from './src/services/api';

// Modular UI Components
import Header from './src/components/Header';
import QrInputCard from './src/components/QrInputCard';
import TraceResultCard from './src/components/TraceResultCard';
import QcResultCard from './src/components/QcResultCard';
import PosResultCard from './src/components/PosResultCard';
import MobileAuthScreen from './src/components/MobileAuthScreen';
import UserProfileCard from './src/components/UserProfileCard';
import ConsumerHistoryCard from './src/components/ConsumerHistoryCard';
import DriverTelemetryCard from './src/components/DriverTelemetryCard';

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE);

  // Authentication State: Bắt buộc đăng nhập khi mở app, mặc định null
  const [currentUser, setCurrentUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);

  // Active view tab (tailored to role)
  const [activeTab, setActiveTab] = useState('trace'); // trace | history | profile | telemetry | qc | pos

  // Shared inputs & results: để trống ban đầu, không gán cứng mã lô
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [traceResult, setTraceResult] = useState(null);
  const [posStatus, setPosStatus] = useState(null);
  const [qcAuditResult, setQcAuditResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Active theme tokens
  const theme = getThemeTokens(isDark);

  // Default tab based on role
  const getTabsForRole = (role) => {
    switch (role) {
      case 'CONSUMER':
        return [
          { id: 'trace', label: 'Tra Cứu Tem QR' },
          { id: 'history', label: 'Lịch Sử Mua' },
          { id: 'profile', label: 'Thẻ VIP' },
        ];
      case 'LOGISTICS_DRIVER':
        return [
          { id: 'telemetry', label: 'Xe Lạnh IoT' },
          { id: 'trace', label: 'Tra Cứu Lô' },
          { id: 'profile', label: 'Hồ Sơ Tài Xế' },
        ];
      case 'QC_INSPECTOR':
        return [
          { id: 'qc', label: 'Kiểm Định KCS' },
          { id: 'trace', label: 'Hộ Chiếu Lô' },
          { id: 'profile', label: 'Hồ Sơ KCS' },
        ];
      case 'CASHIER':
        return [
          { id: 'pos', label: 'Thu Ngân POS' },
          { id: 'trace', label: 'Tra Cứu Tem' },
          { id: 'profile', label: 'Hồ Sơ Thu Ngân' },
        ];
      default:
        return [
          { id: 'trace', label: 'Tra Cứu' },
          { id: 'profile', label: 'Hồ Sơ' },
        ];
    }
  };

  // Login handler
  const handleLoginSuccess = ({ user, token }) => {
    setCurrentUser(user);
    setJwtToken(token);
    setErrorMsg('');
    if (user.role === 'LOGISTICS_DRIVER') {
      setActiveTab('telemetry');
    } else if (user.role === 'QC_INSPECTOR') {
      setActiveTab('qc');
    } else if (user.role === 'CASHIER') {
      setActiveTab('pos');
    } else {
      setActiveTab('trace');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setJwtToken(null);
    setTraceResult(null);
    setQcAuditResult(null);
    setPosStatus(null);
    setErrorMsg('');
    setActiveTab('trace');
  };

  // Trace handler
  const handleScanTrace = async (customCode) => {
    const code = (customCode || qrInput || '').trim();
    if (!code) return;
    setLoading(true);
    setPosStatus(null);
    setQcAuditResult(null);
    setErrorMsg('');
    try {
      const data = await fetchTraceData(apiBaseUrl, code);
      setTraceResult(data);
    } catch (e) {
      setErrorMsg(`Không thể kết nối tới ${apiBaseUrl}. Vui lòng kiểm tra backend.`);
    } finally {
      setLoading(false);
    }
  };

  // QC Audit handler
  const handleRunQcAudit = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await fetchQcAuditData(apiBaseUrl, qrInput);
      setQcAuditResult(data);
    } catch (e) {
      setErrorMsg(`Lỗi kiểm toán QC: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // POS Checkout handler
  const handlePosCheckoutMobile = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await performPosCheckout(apiBaseUrl, qrInput, jwtToken);
      setPosStatus(res);
    } catch (e) {
      setPosStatus({
        httpCode: 503,
        error: 'NETWORK_ERROR',
        message: `Không kết nối được tới Backend (${apiBaseUrl})`,
      });
    } finally {
      setLoading(false);
    }
  };

  // Nếu chưa đăng nhập: Luôn hiển thị màn hình Đăng Nhập / Đăng Ký Mobile
  if (!currentUser || !jwtToken) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
        <Header isDark={isDark} setIsDark={setIsDark} theme={theme} />
        <MobileAuthScreen
          apiBaseUrl={apiBaseUrl}
          onLoginSuccess={handleLoginSuccess}
          theme={theme}
        />
      </SafeAreaView>
    );
  }

  const roleTabs = getTabsForRole(currentUser.role);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* Header với thông tin người dùng và nút Đăng Xuất */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        isDark={isDark}
        setIsDark={setIsDark}
        theme={theme}
      />

      {/* Navigation Tabs theo đúng vai trò */}
      <View style={[styles.tabBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.tabsRow}>
          {roleTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabBtn,
                  active
                    ? { backgroundColor: theme.accent }
                    : { backgroundColor: theme.accentLight },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    active
                      ? { color: '#FFFFFF', fontWeight: '800' }
                      : { color: theme.sub, fontWeight: '600' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Global Error Banner */}
        {errorMsg !== '' && (
          <View style={[styles.errorCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: DRIVER TELEMETRY (Dành cho tài xế xe lạnh)            */}
        {/* ============================================================ */}
        {activeTab === 'telemetry' && (
          <DriverTelemetryCard
            theme={theme}
            currentUser={currentUser}
            apiBaseUrl={apiBaseUrl}
          />
        )}

        {/* ============================================================ */}
        {/* VIEW 2: TRA CỨU TEM QR (Dành cho Khách hàng & Tất cả vai trò) */}
        {/* ============================================================ */}
        {activeTab === 'trace' && (
          <>
            <QrInputCard
              qrInput={qrInput}
              setQrInput={setQrInput}
              activeRole={currentUser.role}
              loading={loading}
              onScanTrace={() => handleScanTrace(qrInput)}
              onRunQcAudit={handleRunQcAudit}
              onPosCheckout={handlePosCheckoutMobile}
              theme={theme}
            />
            <TraceResultCard traceResult={traceResult} theme={theme} />
          </>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: LỊCH SỬ MUA HÀNG (Dành cho Khách hàng)               */}
        {/* ============================================================ */}
        {activeTab === 'history' && (
          <ConsumerHistoryCard
            onSelectBatch={(batchCode) => {
              setQrInput(batchCode);
              setActiveTab('trace');
              handleScanTrace(batchCode);
            }}
            theme={theme}
          />
        )}

        {/* ============================================================ */}
        {/* VIEW 4: KIỂM ĐỊNH KCS (Dành cho QC Inspector)                 */}
        {/* ============================================================ */}
        {activeTab === 'qc' && (
          <>
            <QrInputCard
              qrInput={qrInput}
              setQrInput={setQrInput}
              activeRole="INBOUND_QC"
              loading={loading}
              onScanTrace={() => handleScanTrace(qrInput)}
              onRunQcAudit={handleRunQcAudit}
              onPosCheckout={handlePosCheckoutMobile}
              theme={theme}
            />
            <QcResultCard qcAuditResult={qcAuditResult} theme={theme} />
          </>
        )}

        {/* ============================================================ */}
        {/* VIEW 5: QUẦY THU NGÂN POS (Dành cho Cashier)                 */}
        {/* ============================================================ */}
        {activeTab === 'pos' && (
          <>
            <QrInputCard
              qrInput={qrInput}
              setQrInput={setQrInput}
              activeRole="POS_CASHIER"
              loading={loading}
              onScanTrace={() => handleScanTrace(qrInput)}
              onRunQcAudit={handleRunQcAudit}
              onPosCheckout={handlePosCheckoutMobile}
              theme={theme}
            />
            <PosResultCard posStatus={posStatus} theme={theme} />
          </>
        )}

        {/* ============================================================ */}
        {/* VIEW 6: THÔNG TIN HỒ SƠ CÁ NHÂN & THẺ THÀNH VIÊN            */}
        {/* ============================================================ */}
        {activeTab === 'profile' && (
          <UserProfileCard
            currentUser={currentUser}
            onLogout={handleLogout}
            theme={theme}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 11,
  },
  scrollBody: {
    padding: 16,
    gap: 14,
  },
  errorCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
