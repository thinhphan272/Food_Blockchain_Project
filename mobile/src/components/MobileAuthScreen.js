import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { loginMobile, registerMobileConsumer } from '../services/api';

const PORTALS = [
  { id: 'consumer', label: 'Khách hàng', icon: '👤' },
  { id: 'enterprise', label: 'Doanh nghiệp', icon: '🚚' },
  { id: 'admin', label: 'Quản trị (Admin)', icon: '⚡' },
];

const ENTERPRISE_ROLES = [
  { id: 'LOGISTICS_DRIVER', label: 'Tài Xế Xe Lạnh' },
  { id: 'QC_INSPECTOR', label: 'KCS Kiểm Định' },
  { id: 'CASHIER', label: 'Thu Ngân POS' },
  { id: 'PRODUCER', label: 'Nông Trại Sản Xuất' },
];

export default function MobileAuthScreen({
  apiBaseUrl,
  onLoginSuccess,
  theme,
}) {
  const [selectedPortal, setSelectedPortal] = useState('consumer');
  const [authView, setAuthView] = useState('login'); // login | register (for consumer)
  const [enterpriseRole, setEnterpriseRole] = useState('LOGISTICS_DRIVER');

  // Input states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Login
  const handleLogin = async () => {
    const uName = username.trim();
    const uPass = password.trim();
    if (!uName || !uPass) {
      setErrorMsg('Vui lòng nhập tên đăng nhập và mật khẩu!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await loginMobile(apiBaseUrl, uName, uPass);
      
      // Kiểm tra cổng và vai trò nghiêm ngặt
      if (selectedPortal === 'admin' && res.role !== 'ADMIN') {
        setErrorMsg(`Cổng Quản trị chỉ chấp nhận tài khoản ADMIN! Tài khoản của bạn có vai trò [${res.role}].`);
        setLoading(false);
        return;
      }
      if (selectedPortal === 'enterprise') {
        if (res.role === 'ADMIN') {
          setErrorMsg('Tài khoản Quản trị viên (ADMIN) vui lòng đăng nhập tại Cổng Quản Trị!');
          setLoading(false);
          return;
        }
        if (res.role === 'CONSUMER') {
          setErrorMsg('Tài khoản Khách hàng vui lòng đăng nhập tại Cổng Khách Hàng!');
          setLoading(false);
          return;
        }
        if (enterpriseRole && res.role !== enterpriseRole) {
          setErrorMsg(`Tài khoản "${uName}" có vai trò [${res.role}], không khớp với vai trò được chọn [${enterpriseRole}]!`);
          setLoading(false);
          return;
        }
      }
      if (selectedPortal === 'consumer' && res.role !== 'CONSUMER') {
        setErrorMsg(`Cổng này dành riêng cho Khách Hàng Tiêu Dùng! Tài khoản của bạn có vai trò [${res.role}].`);
        setLoading(false);
        return;
      }

      // Đăng nhập thành công
      onLoginSuccess({
        user: {
          userId: res.userId,
          username: res.username || uName,
          fullName: res.fullName || uName,
          role: res.role,
          department: res.department || 'Operations',
          phone: res.phone || '',
          identityCard: res.identityCard || '',
          assignedEntity: res.assignedEntity || '',
        },
        token: res.token,
      });
    } catch (err) {
      if (err.data?.error === 'USER_NOT_FOUND' || err.status === 404) {
        setErrorMsg(`Tài khoản "${uName}" không tồn tại trên hệ thống! Vui lòng kiểm tra lại.`);
      } else if (err.data?.error === 'INVALID_CREDENTIALS') {
        setErrorMsg('Mật khẩu không chính xác! Vui lòng thử lại.');
      } else if (err.data?.error === 'ACCOUNT_DISABLED') {
        setErrorMsg('Tài khoản này đã bị khóa bởi Quản trị viên!');
      } else {
        setErrorMsg(err.message || 'Không thể kết nối đến máy chủ.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Register (for Consumer)
  const handleRegister = async () => {
    const uName = username.trim();
    const uPass = password.trim();
    if (!uName || !uPass) {
      setErrorMsg('Vui lòng nhập tên đăng nhập và mật khẩu!');
      return;
    }
    if (uPass !== confirmPassword.trim()) {
      setErrorMsg('Mật khẩu xác nhận không khớp!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await registerMobileConsumer(apiBaseUrl, {
        username: uName,
        password: uPass,
        fullName: fullName.trim() || uName,
        phone: phone.trim(),
      });

      Alert.alert(
        'Đăng Ký Thành Công!',
        `Chào mừng ${res.fullName || uName} đến với SmartChain. Vui lòng đăng nhập để bắt đầu.`,
        [{ text: 'Đăng Nhập Ngay', onPress: () => setAuthView('login') }]
      );
      setAuthView('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg(err.message || 'Đăng ký tài khoản thất bại!');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign In button (Inactive notice as requested)
  const handleGoogleSignInClick = () => {
    Alert.alert(
      'Thông Báo',
      'Tính năng Đăng nhập bằng Google Gmail đang được bảo trì và sẽ hỗ trợ trong phiên bản tiếp theo.'
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Brand Logo & Header */}
      <View style={styles.brandContainer}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoMark}>❖</Text>
        </View>
        <Text style={[styles.brandTitle, { color: theme.text }]}>SmartChain</Text>
        <Text style={[styles.brandSubtitle, { color: theme.sub }]}>
          Nền Tảng Xác Thực & Quản Trị Chuỗi Lạnh Toàn Trình
        </Text>
      </View>

      {/* Portal Selection Tabs */}
      <View style={[styles.portalTabs, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {PORTALS.map((p) => {
          const active = selectedPortal === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => {
                setSelectedPortal(p.id);
                setErrorMsg('');
              }}
              style={[
                styles.portalTab,
                active ? { backgroundColor: theme.accent } : null,
              ]}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13 }}>{p.icon}</Text>
              <Text
                style={[
                  styles.portalTabText,
                  active
                    ? { color: '#FFFFFF', fontWeight: '800' }
                    : { color: theme.sub, fontWeight: '600' },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error Banner */}
      {errorMsg !== '' && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
        </View>
      )}

      {/* Form Container */}
      <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Consumer View: Toggle Login / Register */}
        {selectedPortal === 'consumer' && (
          <View style={styles.authModeToggle}>
            <TouchableOpacity
              onPress={() => {
                setAuthView('login');
                setErrorMsg('');
              }}
              style={[
                styles.authModeBtn,
                authView === 'login' && { backgroundColor: theme.accent },
              ]}
            >
              <Text
                style={[
                  styles.authModeText,
                  authView === 'login'
                    ? { color: '#FFFFFF', fontWeight: '800' }
                    : { color: theme.sub },
                ]}
              >
                Đăng Nhập
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setAuthView('register');
                setErrorMsg('');
              }}
              style={[
                styles.authModeBtn,
                authView === 'register' && { backgroundColor: theme.accent },
              ]}
            >
              <Text
                style={[
                  styles.authModeText,
                  authView === 'register'
                    ? { color: '#FFFFFF', fontWeight: '800' }
                    : { color: theme.sub },
                ]}
              >
                Đăng Ký Tài Khoản
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Enterprise View: Select Role */}
        {selectedPortal === 'enterprise' && (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.sub }]}>CHỌN VAI TRÒ CÔNG TÁC *</Text>
            <View style={styles.roleChips}>
              {ENTERPRISE_ROLES.map((r) => {
                const active = enterpriseRole === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => setEnterpriseRole(r.id)}
                    style={[
                      styles.roleChip,
                      active
                        ? { backgroundColor: theme.accent, borderColor: theme.accent }
                        : { backgroundColor: theme.accentLight, borderColor: theme.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        active
                          ? { color: '#FFFFFF', fontWeight: '800' }
                          : { color: theme.text, fontWeight: '600' },
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Inputs for Login or Register */}
        {selectedPortal === 'consumer' && authView === 'register' ? (
          <>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.sub }]}>TÊN ĐĂNG NHẬP *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="Nhập username..."
                placeholderTextColor={theme.sub}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.sub }]}>HỌ VÀ TÊN *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="Nguyễn Văn A..."
                placeholderTextColor={theme.sub}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.sub }]}>SỐ ĐIỆN THOẠI</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="0988..."
                placeholderTextColor={theme.sub}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.sub }]}>MẬT KHẨU *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="••••••"
                placeholderTextColor={theme.sub}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.sub }]}>XÁC NHẬN MẬT KHẨU *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="••••••"
                placeholderTextColor={theme.sub}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              style={[styles.submitBtn, { backgroundColor: theme.accent }]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>ĐĂNG KÝ TÀI KHOẢN MỚI</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.sub }]}>
                {selectedPortal === 'admin'
                  ? 'TÀI KHOẢN QUẢN TRỊ *'
                  : selectedPortal === 'enterprise'
                  ? 'TÊN ĐĂNG NHẬP DOANH NGHIỆP *'
                  : 'TÊN ĐĂNG NHẬP / EMAIL *'}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder={
                  selectedPortal === 'admin'
                    ? 'admin...'
                    : selectedPortal === 'enterprise'
                    ? 'driver, qc, cashier, producer...'
                    : 'customer hoặc username...'
                }
                placeholderTextColor={theme.sub}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.sub }]}>MẬT KHẨU *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="••••••••"
                placeholderTextColor={theme.sub}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={[styles.submitBtn, { backgroundColor: theme.accent }]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {selectedPortal === 'admin'
                    ? 'ĐĂNG NHẬP QUẢN TRỊ'
                    : selectedPortal === 'enterprise'
                    ? 'ĐĂNG NHẬP CÁN BỘ'
                    : 'ĐĂNG NHẬP KHÁCH HÀNG'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Google Sign In button for consumer */}
            {selectedPortal === 'consumer' && (
              <TouchableOpacity
                onPress={handleGoogleSignInClick}
                style={[styles.googleBtn, { borderColor: theme.border }]}
                activeOpacity={0.8}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.googleBtnText, { color: theme.text }]}>
                  Đăng nhập với Google Gmail
                </Text>
              </TouchableOpacity>
            )}

            {/* Hint Box */}
            <View style={styles.hintContainer}>
              <Text style={[styles.hintText, { color: theme.sub }]}>
                {selectedPortal === 'admin'
                  ? 'Tài khoản demo: admin / 123'
                  : selectedPortal === 'enterprise'
                  ? 'Tài khoản demo: driver, qc, cashier, producer (Pass: 123)'
                  : 'Tài khoản demo: customer / 123 (hoặc đăng ký mới)'}
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#F95716',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#F95716',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  logoMark: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  portalTabs: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  portalTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
  },
  portalTabText: {
    fontSize: 11,
  },
  errorCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  formCard: {
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  authModeToggle: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 4,
    marginBottom: 16,
  },
  authModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  authModeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 11,
  },
  submitBtn: {
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#F95716',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  googleIcon: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  hintContainer: {
    marginTop: 14,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});

