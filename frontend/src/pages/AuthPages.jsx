import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SmartChainCube,
  AdminBadge,
  ShieldCheck,
  Truck,
  Layers,
  CheckSquare,
  ShoppingCart,
  QrCode,
  AlertTriangle,
  ChevronLeft,
  ArrowUpRight,
  UserCheck,
  Box,
  X,
} from '../components/MomentumIcons';

// Vector SVG chuẩn chính thức của Google (4 màu)
function GoogleGIcon({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`inline-block shrink-0 ${className}`}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function AuthPages({
  location,
  navigate,
  authError,
  setAuthError,
  authLoading,
  authView,
  setAuthView,
  authUsername,
  setAuthUsername,
  authPassword,
  setAuthPassword,
  authFullName,
  setAuthFullName,
  authPhone,
  setAuthPhone,
  authConfirmPassword,
  setAuthConfirmPassword,
  enterpriseLoginRole,
  setEnterpriseLoginRole,
  showPassword,
  setShowPassword,
  handleLoginSubmit,
  handleRegisterSubmit,
  handleGoogleSignIn,
}) {
  const isPathAdmin = location.pathname === '/admin/login' || location.pathname === '/admin';
  const isPathEnterprise = location.pathname === '/enterprise/login' || location.pathname === '/enterprise';
  const isPathConsumer = location.pathname === '/consumer/login' || location.pathname === '/consumer';

  // Xác định cổng hiện tại
  const currentPortal = isPathAdmin ? 'admin' : isPathEnterprise ? 'enterprise' : isPathConsumer ? 'consumer' : 'gateway';

  // State cấu hình & điều phối Google OAuth 2.0 Thật (Google Identity Services)
  const [showGoogleConfigModal, setShowGoogleConfigModal] = useState(false);
  const [googleClientIdInput, setGoogleClientIdInput] = useState(() => {
    return (
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      localStorage.getItem('smartchain_google_client_id') ||
      ''
    );
  });

  // Kích hoạt cửa sổ đăng nhập Google chính thức (accounts.google.com)
  const triggerRealGoogleSignIn = (forcedClientId = null) => {
    const clientId = (forcedClientId || googleClientIdInput || '').trim();

    if (!clientId) {
      setShowGoogleConfigModal(true);
      return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      setAuthError('Đang tải thư viện Google Identity Services từ Google... Vui lòng kiểm tra kết nối mạng và thử lại sau giây lát!');
      return;
    }

    try {
      setAuthError('');
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setAuthError('Đăng nhập Google bị hủy hoặc thất bại: ' + (tokenResponse.error_description || tokenResponse.error));
            return;
          }
          if (!tokenResponse.access_token) {
            setAuthError('Google không phản hồi Access Token hợp lệ!');
            return;
          }

          // Gọi Google UserInfo API từ chính máy chủ Google để lấy dữ liệu thật
          try {
            const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            const realUser = await gRes.json();
            if (!realUser.email) {
              throw new Error('Google không cung cấp địa chỉ email được xác thực!');
            }

            // Gửi dữ liệu thật kèm accessToken cho Backend SmartChain cấp JWT
            await handleGoogleSignIn({
              email: realUser.email,
              name: realUser.name || realUser.given_name || 'Khách Hàng Google',
              picture: realUser.picture || '',
              accessToken: tokenResponse.access_token,
              sub: realUser.sub,
            });
          } catch (err) {
            console.error('Lỗi khi lấy thông tin Google User:', err);
            setAuthError('Lỗi xác thực tài khoản Google: ' + err.message);
          }
        },
      });

      // Mở cửa sổ popup Google thật chính thức
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      console.error('Lỗi khởi tạo Google Token Client:', err);
      setAuthError('Lỗi khởi tạo Google OAuth: ' + err.message);
    }
  };

  // Dữ liệu nội dung theo từng cổng chuyên biệt
  const heroContent = {
    admin: {
      badge: 'HẠ TẦNG & QUẢN TRỊ CẤP CAO',
      title: 'TRUNG TÂM ĐIỀU HÀNH DỮ LIỆU & PHÂN QUYỀN.',
      subtitle: 'Kiểm soát 5 cơ sở dữ liệu chuyên biệt, giám sát phân quyền tài khoản doanh nghiệp và bảo toàn chuỗi khối bất biến.',
      bgImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=2000&q=85',
      portalPill: 'CỔNG QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN)',
    },
    enterprise: {
      badge: 'VẬN HÀNH CHUỖI LẠNH LIÊN TỤC',
      title: 'KẾT NỐI CHUỖI GIÁ TRỊ TỪ NÔNG TRẠI ĐẾN QUẦY KỆ.',
      subtitle: 'Đồng bộ quy chuẩn vi khí hậu đa nhiệt độ, giám sát hành trình xe lạnh IoT và phân phối hàng hóa theo ưu tiên độ tươi thực tế.',
      bgImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=85',
      portalPill: 'CỔNG CÁN BỘ VẬN HÀNH DOANH NGHIỆP',
    },
    consumer: {
      badge: 'MINH BẠCH & AN TOÀN TUYỆT ĐỐI',
      title: 'TRA CỨU NGUỒN GỐC TỪ NÔNG TRẠI ĐẾN BÀN ĂN.',
      subtitle: 'Xác thực độ tươi TTI thời gian thực, kiểm tra chứng nhận an toàn VietGAP và đối soát lịch sử hành trình không thể làm giả.',
      bgImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=2000&q=85',
      portalPill: 'CỔNG NGƯỜI TIÊU DÙNG THÔNG MINH',
    },
    gateway: {
      badge: 'SMARTCHAIN ENTERPRISE PLATFORM',
      title: 'HỆ THỐNG CHUỖI LẠNH MINH BẠCH ĐA NHIỆT ĐỘ.',
      subtitle: 'Tích hợp IoT Telemetry, Blockchain Hyperledger & 5 NoSQL giải quyết trọn vẹn bài toán thất thoát sau thu hoạch.',
      bgImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=85',
      portalPill: 'CỔNG ĐIỀU HƯỚNG TRUNG TÂM',
    },
  }[currentPortal];

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans antialiased text-white [font-family:'Plus_Jakarta_Sans',system-ui,sans-serif]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={heroContent.bgImage}
          alt="SmartChain Background"
          className="w-full h-full object-cover object-center filter brightness-[0.75] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/95 via-black/80 to-[#F95716]/30" />
        <div className="absolute inset-0 backdrop-blur-[1px]" />
      </div>

      <header className="fixed top-0 inset-x-0 h-20 z-50 backdrop-blur-2xl bg-black/40 border-b border-white/10 px-6 sm:px-10 flex items-center justify-between">
        {/* Logo Thương Hiệu */}
        <div
          onClick={() => { setAuthError(''); navigate('/'); }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F95716] text-white shadow-[0_8px_20px_rgba(249,87,22,0.45)] group-hover:scale-105 transition-all">
            <SmartChainCube size={22} />
          </span>
          <div className="leading-tight">
            <span className="text-[17px] font-black tracking-tight text-white block">
              SmartChain
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#F95716]">
              Enterprise Cold-Chain
            </span>
          </div>
        </div>

        {/* Menu chuyển nhanh các cổng */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-white/70">
          <button
            type="button"
            onClick={() => { setAuthError(''); navigate('/'); }}
            className={`transition-all hover:text-[#F95716] ${currentPortal === 'gateway' ? 'text-[#F95716] font-extrabold pb-1 border-b-2 border-[#F95716]' : ''}`}
          >
            Cổng Chọn
          </button>
          <button
            type="button"
            onClick={() => { setAuthError(''); navigate('/consumer/login'); }}
            className={`transition-all hover:text-[#F95716] ${currentPortal === 'consumer' ? 'text-[#F95716] font-extrabold pb-1 border-b-2 border-[#F95716]' : ''}`}
          >
            Khách Hàng
          </button>
          <button
            type="button"
            onClick={() => { setAuthError(''); navigate('/enterprise/login'); }}
            className={`transition-all hover:text-[#F95716] ${currentPortal === 'enterprise' ? 'text-[#F95716] font-extrabold pb-1 border-b-2 border-[#F95716]' : ''}`}
          >
            Cán Bộ Doanh Nghiệp
          </button>
          <button
            type="button"
            onClick={() => { setAuthError(''); navigate('/admin/login'); }}
            className={`transition-all hover:text-[#F95716] ${currentPortal === 'admin' ? 'text-[#F95716] font-extrabold pb-1 border-b-2 border-[#F95716]' : ''}`}
          >
            Quản Trị Viên (Admin)
          </button>
        </nav>

        {/* Nút Tra Cứu Tem QR */}
        <div className="flex items-center gap-3">
          <Link
            to="/trace/LOT-VEG-2026-001"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#F95716] text-white text-xs font-black shadow-[0_8px_20px_rgba(249,87,22,0.40)] hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider"
          >
            <QrCode size={14} /> Tra Cứu Tem QR
          </Link>
        </div>
      </header>

      <div className="relative z-10 pt-20 min-h-screen flex flex-col justify-between">
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-144px)]">
          {/* CỘT TRÁI: HERO TIÊU ĐỀ BẢN TO & BADGE */}
          <div className="flex flex-col justify-between p-8 sm:p-12 xl:p-16">
            <div className="pt-4">
              <span className="inline-block px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-[0.16em] bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-lg">
                {heroContent.badge}
              </span>
            </div>

            <div className="max-w-xl space-y-4 pt-12 pb-6">
              <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight leading-[1.12] text-white uppercase drop-shadow-lg">
                {heroContent.title}
              </h1>
              <p className="text-sm sm:text-base font-medium text-white/80 leading-relaxed drop-shadow">
                {heroContent.subtitle}
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-white/90">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-md">
                  <ShieldCheck size={15} className="text-emerald-400" /> Sổ cái Blockchain ECDSA
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-md">
                  <Truck size={15} className="text-blue-400" /> Cảm biến IoT 24/7
                </span>
              </div>
            </div>

            <div className="text-xs text-white/40">
              Nền tảng xác thực an toàn thực phẩm chuỗi lạnh đạt chuẩn VietGAP & GlobalGAP
            </div>
          </div>

          {/* CỘT PHẢI: FORM ĐĂNG NHẬP / CỔNG ĐIỀU HƯỚNG TRONG KHUNG KÍNH MỜ XUYÊN THẤU */}
          <div className="flex flex-col justify-center items-center p-6 sm:p-10 xl:p-14">
            <div className="w-full max-w-md rounded-[32px] backdrop-blur-2xl bg-white/[0.08] border border-white/20 p-7 sm:p-9 shadow-[0_24px_80px_rgba(0,0,0,0.55)] space-y-6">
              
              <div className="flex items-center justify-between pb-1">
                <span className="inline-block px-3 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-[#F95716]/20 text-[#F95716] border border-[#F95716]/40 backdrop-blur-md">
                  {heroContent.portalPill}
                </span>
                {currentPortal !== 'gateway' && (
                  <button
                    type="button"
                    onClick={() => { setAuthError(''); navigate('/'); }}
                    className="text-xs font-bold text-white/60 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft size={14} /> Cổng khác
                  </button>
                )}
              </div>

              {authError && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/20 backdrop-blur-md p-3.5 text-xs font-bold text-red-200">
                  <AlertTriangle size={17} className="shrink-0 text-red-400" />
                  <span>{authError}</span>
                </div>
              )}

              {/* CỔNG 1: QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN) */}
              {currentPortal === 'admin' && (
                <form onSubmit={(e) => { e.preventDefault(); handleLoginSubmit(e); }} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1.5">
                      Tài Khoản Quản Trị *
                    </label>
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="Nhập username quản trị..."
                      className="w-full rounded-2xl border border-white/20 bg-white/[0.10] backdrop-blur-md px-4 py-3 text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:border-[#F95716] focus:bg-white/[0.15] transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                        Mật Khẩu Quản Trị *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[11px] font-medium text-white/60 hover:text-white"
                      >
                        {showPassword ? 'Ẩn' : 'Hiện'}
                      </button>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-white/20 bg-white/[0.10] backdrop-blur-md px-4 py-3 text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:border-[#F95716] focus:bg-white/[0.15] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full rounded-2xl bg-[#F95716] hover:bg-[#E0430B] py-3.5 text-sm font-extrabold text-white shadow-[0_8px_25px_rgba(249,87,22,0.40)] hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-wider mt-2 cursor-pointer"
                  >
                    {authLoading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị'}
                  </button>

                  <div className="text-center pt-1">
                    <span className="text-[11px] text-white/50">
                      Bấm để điền mẫu: <button type="button" onClick={() => { setAuthUsername('admin'); setAuthPassword('123'); setAuthError(''); }} className="bg-white/10 hover:bg-[#F95716] cursor-pointer transition-colors px-2 py-0.5 rounded text-white font-mono">admin / 123</button>
                    </span>
                  </div>
                </form>
              )}

              {/* CỔNG 2: CÁN BỘ VẬN HÀNH DOANH NGHIỆP */}
              {currentPortal === 'enterprise' && (
                <form onSubmit={(e) => { e.preventDefault(); handleLoginSubmit(e); }} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-white/80">
                        Chọn Vai Trò Doanh Nghiệp (6 Vai Trò):
                      </label>
                      <span className="text-[11px] text-[#F95716] font-mono font-bold">
                        {enterpriseLoginRole}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        {
                          id: 'LOGISTICS_DRIVER',
                          title: 'Tài Xế Xe Lạnh',
                          code: 'driver_01',
                          icon: Truck,
                          desc: 'Vận chuyển & vi khí hậu',
                        },
                        {
                          id: 'PRODUCER',
                          title: 'Nông Trại Sản Xuất',
                          code: 'farm_dalat',
                          icon: Layers,
                          desc: 'Khai báo & Genesis #0',
                        },
                        {
                          id: 'INBOUND_GATE',
                          title: 'Thủ Kho Tiếp Nhận',
                          code: 'inbound_01',
                          icon: Box,
                          desc: 'Tiếp nhận xe tại cổng kho',
                        },
                        {
                          id: 'QC_INSPECTOR',
                          title: 'KCS Kiểm Định TTI',
                          code: 'qc_gate',
                          icon: ShieldCheck,
                          desc: 'Đối soát Arrhenius & ký số',
                        },
                        {
                          id: 'SHELF_OPERATOR',
                          title: 'Quản Lý Kệ FEFO',
                          code: 'shelf_staff',
                          icon: CheckSquare,
                          desc: 'Sắp xếp quầy theo hạn dùng',
                        },
                        {
                          id: 'CASHIER',
                          title: 'Thu Ngân Quầy POS',
                          code: 'pos_01',
                          icon: ShoppingCart,
                          desc: 'Bán lẻ & hủy tem niêm phong',
                        },
                      ].map((role) => {
                        const IconComponent = role.icon;
                        const isSelected = enterpriseLoginRole === role.id;
                        return (
                          <button
                            type="button"
                            key={role.id}
                            onClick={() => {
                              setEnterpriseLoginRole(role.id);
                              setAuthUsername(role.code);
                              setAuthPassword('123');
                              setAuthError('');
                            }}
                            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                              isSelected
                                ? 'border-[#F95716] bg-[#F95716]/25 shadow-[0_0_15px_rgba(249,87,22,0.35)] ring-1 ring-[#F95716]'
                                : 'border-white/10 bg-white/[0.05] hover:border-white/30 hover:bg-white/[0.08]'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-xl ${
                                  isSelected ? 'bg-[#F95716] text-white' : 'bg-white/10 text-white/70'
                                }`}
                              >
                                <IconComponent size={14} />
                              </span>
                              <span className="text-[9.5px] font-mono text-white/50">
                                {role.code}
                              </span>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white leading-tight">
                                {role.title}
                              </div>
                              <div className="text-[10px] text-white/60 leading-tight mt-0.5">
                                {role.desc}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1.5">
                      Tên Đăng Nhập Doanh Nghiệp *
                    </label>
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="driver_01, farm_dalat, inbound_01, qc_gate, shelf_staff, pos_01..."
                      className="w-full rounded-2xl border border-white/20 bg-white/[0.10] backdrop-blur-md px-4 py-3 text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:border-[#F95716] focus:bg-white/[0.15] transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1.5">
                      Mật Khẩu *
                    </label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-white/20 bg-white/[0.10] backdrop-blur-md px-4 py-3 text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:border-[#F95716] focus:bg-white/[0.15] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full rounded-2xl bg-[#F95716] hover:bg-[#E0430B] py-3.5 text-sm font-extrabold text-white shadow-[0_8px_25px_rgba(249,87,22,0.40)] hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-wider mt-2 cursor-pointer"
                  >
                    {authLoading ? 'Đang xác thực...' : 'Đăng Nhập Cán Bộ Doanh Nghiệp'}
                  </button>

                  <div className="text-center pt-1 space-y-1">
                    <span className="text-[11px] text-white/50 block">Mật khẩu mặc định toàn hệ thống là: <strong className="text-white">123</strong></span>
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      <button type="button" onClick={() => { setEnterpriseLoginRole('LOGISTICS_DRIVER'); setAuthUsername('driver_01'); setAuthPassword('123'); setAuthError(''); }} className="bg-white/10 hover:bg-[#F95716] cursor-pointer transition-colors px-2 py-0.5 rounded text-white font-mono text-[10.5px]">driver_01</button>
                      <button type="button" onClick={() => { setEnterpriseLoginRole('PRODUCER'); setAuthUsername('farm_dalat'); setAuthPassword('123'); setAuthError(''); }} className="bg-white/10 hover:bg-[#F95716] cursor-pointer transition-colors px-2 py-0.5 rounded text-white font-mono text-[10.5px]">farm_dalat</button>
                      <button type="button" onClick={() => { setEnterpriseLoginRole('INBOUND_GATE'); setAuthUsername('inbound_01'); setAuthPassword('123'); setAuthError(''); }} className="bg-white/10 hover:bg-[#F95716] cursor-pointer transition-colors px-2 py-0.5 rounded text-white font-mono text-[10.5px]">inbound_01</button>
                      <button type="button" onClick={() => { setEnterpriseLoginRole('QC_INSPECTOR'); setAuthUsername('qc_gate'); setAuthPassword('123'); setAuthError(''); }} className="bg-white/10 hover:bg-[#F95716] cursor-pointer transition-colors px-2 py-0.5 rounded text-white font-mono text-[10.5px]">qc_gate</button>
                      <button type="button" onClick={() => { setEnterpriseLoginRole('SHELF_OPERATOR'); setAuthUsername('shelf_staff'); setAuthPassword('123'); setAuthError(''); }} className="bg-white/10 hover:bg-[#F95716] cursor-pointer transition-colors px-2 py-0.5 rounded text-white font-mono text-[10.5px]">shelf_staff</button>
                      <button type="button" onClick={() => { setEnterpriseLoginRole('CASHIER'); setAuthUsername('pos_01'); setAuthPassword('123'); setAuthError(''); }} className="bg-white/10 hover:bg-[#F95716] cursor-pointer transition-colors px-2 py-0.5 rounded text-white font-mono text-[10.5px]">pos_01</button>
                    </div>
                  </div>
                </form>
              )}

              {/* CỔNG 3: KHÁCH HÀNG TIÊU DÙNG */}
              {currentPortal === 'consumer' && (
                <div>
                  <div className="flex rounded-2xl bg-white/[0.08] p-1 mb-5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => { setAuthView('login'); setAuthError(''); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        authView === 'login' ? 'bg-[#F95716] text-white shadow-md' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Đăng Nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthView('register'); setAuthError(''); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        authView === 'register' ? 'bg-[#F95716] text-white shadow-md' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Đăng Ký Tài Khoản
                    </button>
                  </div>

                  {authView === 'login' ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleLoginSubmit(e); }} className="space-y-3.5">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1">
                          Tên Đăng Nhập / Email *
                        </label>
                        <input
                          type="text"
                          required
                          value={authUsername}
                          onChange={(e) => setAuthUsername(e.target.value)}
                          placeholder="user@example.com hoặc username..."
                          className="w-full rounded-2xl border border-white/20 bg-white/[0.10] backdrop-blur-md px-4 py-2.5 text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:border-[#F95716] transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1">
                          Mật Khẩu *
                        </label>
                        <input
                          type="password"
                          required
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full rounded-2xl border border-white/20 bg-white/[0.10] backdrop-blur-md px-4 py-2.5 text-sm font-medium text-white placeholder:text-white/40 focus:outline-none focus:border-[#F95716] transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full rounded-2xl bg-[#F95716] hover:bg-[#E0430B] py-3 text-sm font-extrabold text-white shadow-md transition-all uppercase tracking-wider cursor-pointer"
                      >
                        {authLoading ? 'Đang xử lý...' : 'Đăng Nhập Khách Hàng'}
                      </button>

                      <div className="text-center pt-1">
                        <span className="text-[11px] text-white/50">
                          Bấm để điền mẫu: <button type="button" onClick={() => { setAuthUsername('customer'); setAuthPassword('123'); setAuthError(''); }} className="bg-white/10 hover:bg-[#F95716] cursor-pointer transition-colors px-2 py-0.5 rounded text-white font-mono">customer / 123</button> (hoặc bấm tab Đăng Ký bên trên)
                        </span>
                      </div>

                      <div className="relative py-2 text-center">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/15" />
                        </div>
                        <span className="relative bg-[#1C140F]/80 px-3 text-[11px] font-semibold text-white/50 uppercase tracking-wider rounded-full backdrop-blur-md">
                          Hoặc đăng nhập với
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => triggerRealGoogleSignIn()}
                        disabled={authLoading}
                        className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/[0.12] hover:bg-white/[0.22] backdrop-blur-xl py-3 px-4 text-xs font-bold text-white shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <GoogleGIcon size={18} />
                        <span>Đăng nhập trực tiếp bằng Google (accounts.google.com)</span>
                      </button>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setShowGoogleConfigModal(true)}
                          className="text-[10px] text-white/50 hover:text-white underline cursor-pointer"
                        >
                          ⚙️ Cấu hình Google Client ID OAuth 2.0
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleRegisterSubmit(e); }} className="space-y-3">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1">
                          Tên Đăng Nhập *
                        </label>
                        <input
                          type="text"
                          required
                          value={authUsername}
                          onChange={(e) => setAuthUsername(e.target.value)}
                          placeholder="username..."
                          className="w-full rounded-2xl border border-white/20 bg-white/[0.10] px-3.5 py-2 text-xs text-white placeholder:text-white/40 focus:border-[#F95716] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1">
                          Họ Và Tên *
                        </label>
                        <input
                          type="text"
                          required
                          value={authFullName}
                          onChange={(e) => setAuthFullName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          className="w-full rounded-2xl border border-white/20 bg-white/[0.10] px-3.5 py-2 text-xs text-white placeholder:text-white/40 focus:border-[#F95716] focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1">
                            Mật Khẩu *
                          </label>
                          <input
                            type="password"
                            required
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder="••••••"
                            className="w-full rounded-2xl border border-white/20 bg-white/[0.10] px-3.5 py-2 text-xs text-white placeholder:text-white/40 focus:border-[#F95716] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1">
                            Xác Nhận *
                          </label>
                          <input
                            type="password"
                            required
                            value={authConfirmPassword}
                            onChange={(e) => setAuthConfirmPassword(e.target.value)}
                            placeholder="••••••"
                            className="w-full rounded-2xl border border-white/20 bg-white/[0.10] px-3.5 py-2 text-xs text-white placeholder:text-white/40 focus:border-[#F95716] focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full rounded-2xl bg-[#F95716] hover:bg-[#E0430B] py-3 text-xs font-extrabold text-white shadow-md transition-all uppercase tracking-wider mt-1"
                      >
                        {authLoading ? 'Đang tạo...' : 'Đăng Ký Tài Khoản'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* CỔNG 4: TRUNG TÂM ĐIỀU HƯỚNG CÁC CỔNG (GATEWAY HUB) */}
              {currentPortal === 'gateway' && (
                <div className="space-y-3.5">
                  <div
                    onClick={() => { setAuthError(''); navigate('/consumer/login'); }}
                    className="p-4 rounded-2xl border border-white/20 hover:border-[#F95716] bg-white/[0.08] hover:bg-white/[0.16] backdrop-blur-xl cursor-pointer hover:shadow-xl transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <UserCheck size={20} />
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-[#F95716] transition-colors">
                          Cổng khách hàng tiêu dùng
                        </h4>
                        <p className="text-xs text-white/60 mt-0.5">Tra cứu độ tươi TTI, đăng nhập Gmail & đăng ký tự do</p>
                      </div>
                    </div>
                    <ArrowUpRight size={17} className="text-white/50 group-hover:text-[#F95716] transition-colors" />
                  </div>

                  <div
                    onClick={() => { setAuthError(''); navigate('/enterprise/login'); }}
                    className="p-4 rounded-2xl border border-white/20 hover:border-[#F95716] bg-white/[0.08] hover:bg-white/[0.16] backdrop-blur-xl cursor-pointer hover:shadow-xl transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        <Truck size={20} />
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-[#F95716] transition-colors">
                          Cổng cán bộ doanh nghiệp
                        </h4>
                        <p className="text-xs text-white/60 mt-0.5">Dành cho Tài xế, Nông trại, KCS, Quầy kệ, Thu ngân</p>
                      </div>
                    </div>
                    <ArrowUpRight size={17} className="text-white/50 group-hover:text-[#F95716] transition-colors" />
                  </div>

                  <div
                    onClick={() => { setAuthError(''); navigate('/admin/login'); }}
                    className="p-4 rounded-2xl border-2 border-[#F95716]/50 hover:border-[#F95716] bg-[#F95716]/15 hover:bg-[#F95716]/25 backdrop-blur-xl cursor-pointer hover:shadow-xl transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F95716] text-white shadow-md">
                        <AdminBadge size={22} />
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-[#F95716] transition-colors">
                          Cổng quản trị hệ thống (Admin)
                        </h4>
                        <p className="text-xs text-white/60 mt-0.5">Cấu hình 5 cơ sở dữ liệu & cấp phát tài khoản cán bộ</p>
                      </div>
                    </div>
                    <ArrowUpRight size={17} className="text-[#F95716]" />
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>

        {/* CHÂN TRANG FOOTER NHÌN XUYÊN THẤU KÍNH MỜ */}
        <footer className="h-16 shrink-0 backdrop-blur-2xl bg-black/60 border-t border-white/10 text-white/50 px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between text-xs z-20">
          <div>
            &copy; 2026 SmartChain Enterprise. Nền tảng truy xuất nguồn gốc chuỗi lạnh nông sản toàn trình.
          </div>
          <div className="flex items-center gap-6 mt-2 sm:mt-0 font-medium">
            <span className="hover:text-white cursor-pointer transition-colors">Chính Sách Bảo Mật</span>
            <span className="hover:text-white cursor-pointer transition-colors">Điều Khoản Vận Hành</span>
            <span className="hover:text-white cursor-pointer transition-colors">Hỗ Trợ Kỹ Thuật</span>
          </div>
        </footer>
        {/* MODAL CẤU HÌNH & KẾT NỐI GOOGLE OAUTH 2.0 THẬT (GOOGLE IDENTITY SERVICES) */}
        {showGoogleConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-neutral-800">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#1C140F] border border-orange-950/10 dark:border-orange-500/20 p-6 sm:p-7 shadow-2xl space-y-5 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 shrink-0">
                    <GoogleGIcon size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      Kết Nối Google OAuth 2.0 Thật
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      Mở cửa sổ đăng nhập trực tiếp từ máy chủ chính thức của Google (accounts.google.com)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleConfigModal(false)}
                  className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Hướng dẫn chi tiết tạo Google Client ID */}
              <div className="p-4 rounded-2xl bg-orange-500/[0.06] border border-[#F95716]/20 text-xs text-[#1A1A1A] dark:text-[#F5F5F5] space-y-2">
                <div className="font-bold text-[#F95716] flex items-center gap-1.5">
                  <span>ℹ️ Hướng dẫn cấp phép Google OAuth 2.0 Web Client:</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11.5px] text-neutral-600 dark:text-neutral-300">
                  <li>
                    Truy cập trang Quản lý khóa Google:{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#F95716] underline font-semibold"
                    >
                      console.cloud.google.com/apis/credentials
                    </a>
                  </li>
                  <li>Bấm <strong>Create Credentials</strong> &rarr; Chọn <strong>OAuth client ID</strong> &rarr; Application type: <strong>Web application</strong>.</li>
                  <li>
                    Tại mục <strong>Authorized JavaScript origins</strong>, thêm 2 địa chỉ sau:
                    <div className="mt-1 space-y-1 font-mono text-[11px] bg-black/5 dark:bg-black/30 p-2 rounded-xl">
                      <div>http://localhost:5173</div>
                      <div>{window.location.origin}</div>
                    </div>
                  </li>
                  <li>Sao chép mã <strong>Client ID</strong> (dạng: <span className="font-mono text-[#F95716]">...apps.googleusercontent.com</span>) và dán vào ô bên dưới.</li>
                </ol>
              </div>

              {/* Ô nhập Google Client ID */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                  Google Client ID Của Bạn *
                </label>
                <input
                  type="text"
                  value={googleClientIdInput}
                  onChange={(e) => setGoogleClientIdInput(e.target.value)}
                  placeholder="Ví dụ: 123456789-abcdef.apps.googleusercontent.com"
                  className="w-full rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-white/[0.03] p-3 text-xs font-mono text-[#1A1A1A] dark:text-white focus:outline-none focus:border-[#F95716]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowGoogleConfigModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={!googleClientIdInput.trim()}
                  onClick={() => {
                    const cleanId = googleClientIdInput.trim();
                    localStorage.setItem('smartchain_google_client_id', cleanId);
                    setShowGoogleConfigModal(false);
                    // Lập tức kích hoạt mở cửa sổ Google thật
                    setTimeout(() => triggerRealGoogleSignIn(cleanId), 200);
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-[#F95716] text-white text-xs font-black shadow-md hover:brightness-105 cursor-pointer disabled:opacity-40"
                >
                  Lưu Client ID & Mở Đăng Nhập Google Thật
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

