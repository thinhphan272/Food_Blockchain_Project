import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  Repeat,
  Plus,
  Truck,
  ShieldCheck,
  Layers,
  Database,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from '../components/MomentumIcons';
import CustomSelect from '../components/common/CustomSelect';

// Bảng ánh xạ mã hóa Windows-1252 sang byte UTF-8 để sửa triệt để lỗi font chữ (mojibake)
const CP1252_MAP = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86,
  0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95,
  0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

function fixMojibake(str) {
  if (!str || typeof str !== 'string') return str;
  if (!str.includes('Ã') && !str.includes('á»') && !str.includes('Ä') && !str.includes('»') && !str.includes('º') && !str.includes('§')) {
    return str;
  }
  try {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 256) {
        bytes.push(code);
      } else if (CP1252_MAP[code]) {
        bytes.push(CP1252_MAP[code]);
      } else {
        return str
          .replace(/Thá»‹nh/g, 'Thịnh')
          .replace(/Há»£p TÃ¡c XÃ£ Rau Ä[\s\S]*?Láº¡t/g, 'Hợp Tác Xã Rau Đà Lạt')
          .replace(/Thu NgÃ¢n Quáº§y 1 TÃ¢n PhÃº/g, 'Thu Ngân Quầy 1 Tân Phú');
      }
    }
    const uint8 = new Uint8Array(bytes);
    return new TextDecoder('utf-8', { fatal: true }).decode(uint8);
  } catch (e) {
    return str
      .replace(/Thá»‹nh/g, 'Thịnh')
      .replace(/Há»£p TÃ¡c XÃ£ Rau Ä[\s\S]*?Láº¡t/g, 'Hợp Tác Xã Rau Đà Lạt')
      .replace(/Thu NgÃ¢n Quáº§y 1 TÃ¢n PhÃº/g, 'Thu Ngân Quầy 1 Tân Phú');
  }
}

function formatRoleName(role) {
  const r = (typeof role === 'object' ? role?.roleName : role) || 'CONSUMER';
  if (r === 'ROLE_ADMIN') return 'ADMIN';
  if (r === 'ROLE_SUPPLIER') return 'PRODUCER';
  if (r === 'ROLE_POS') return 'CASHIER';
  if (r === 'ROLE_DRIVER') return 'LOGISTICS_DRIVER';
  if (r === 'ROLE_QC') return 'QC_INSPECTOR';
  return r.replace(/^ROLE_/, '');
}

export default function UserManagementPage({
  userFilterRole,
  setUserFilterRole,
  userSearchQuery,
  setUserSearchQuery,
  enterpriseUsersList = [],
  setSelectedUserDetail,
  loadEnterpriseUsers,
  newEnterpriseRole,
  setNewEnterpriseRole,
  newEnterpriseUsername,
  setNewEnterpriseUsername,
  newEnterprisePassword,
  setNewEnterprisePassword,
  newEnterpriseFullName,
  setNewEnterpriseFullName,
  newEnterprisePhone,
  setNewEnterprisePhone,
  newEnterpriseIdentityCard,
  setNewEnterpriseIdentityCard,
  newEnterpriseAssignedEntity,
  setNewEnterpriseAssignedEntity,
  newEnterpriseNotes,
  setNewEnterpriseNotes,
  handleCreateEnterpriseUser,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [createFormError, setCreateFormError] = useState('');
  const USERS_PER_PAGE = 12;

  const roleFilterOptions = [
    { value: 'ALL', label: 'Tất cả vai trò' },
    { value: 'PRODUCER', label: 'Nông trại (PRODUCER)' },
    { value: 'LOGISTICS_DRIVER', label: 'Tài xế (LOGISTICS_DRIVER)' },
    { value: 'QC_INSPECTOR', label: 'Kiểm định (QC_INSPECTOR)' },
    { value: 'INBOUND_GATE', label: 'Thủ kho (INBOUND_GATE)' },
    { value: 'SHELF_OPERATOR', label: 'Quản lý kệ (SHELF_OPERATOR)' },
    { value: 'CASHIER', label: 'Thu ngân (CASHIER)' },
    { value: 'ADMIN', label: 'Quản trị viên (ADMIN)' },
    { value: 'CONSUMER', label: 'Khách hàng (CONSUMER)' },
  ];

  const createRoleOptions = [
    { value: 'LOGISTICS_DRIVER', label: 'Tài xế xe lạnh (LOGISTICS_DRIVER)' },
    { value: 'PRODUCER', label: 'Nông trại sản xuất (PRODUCER)' },
    { value: 'QC_INSPECTOR', label: 'Kiểm định viên KCS (QC_INSPECTOR)' },
    { value: 'INBOUND_GATE', label: 'Thủ kho tiếp nhận (INBOUND_GATE)' },
    { value: 'SHELF_OPERATOR', label: 'Quản lý quầy kệ (SHELF_OPERATOR)' },
    { value: 'CASHIER', label: 'Thu ngân quầy POS (CASHIER)' },
    { value: 'ADMIN', label: 'Quản trị hệ thống (ADMIN)' },
  ];

  const CARD =
    'rounded-[28px] border border-orange-950/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]';

  // Lọc danh sách tài khoản theo Vai trò và Từ khóa tìm kiếm
  const filteredUsers = React.useMemo(() => {
    return enterpriseUsersList.filter((u) => {
      const roleStr = formatRoleName(u.role?.roleName || u.role);
      if (userFilterRole !== 'ALL' && roleStr !== userFilterRole) {
        return false;
      }
      if (!userSearchQuery) return true;
      const q = userSearchQuery.toLowerCase();
      return (
        u.username?.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.assignedEntity?.toLowerCase().includes(q)
      );
    });
  }, [enterpriseUsersList, userFilterRole, userSearchQuery]);

  // Đặt lại trang về 1 khi bộ lọc thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [userFilterRole, userSearchQuery, enterpriseUsersList.length]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safePage - 1) * USERS_PER_PAGE,
    safePage * USERS_PER_PAGE
  );

  // Kiểm tra trùng tên đăng nhập trực tiếp trước khi gửi lên Server
  const onSubmitNewUser = async (e) => {
    e.preventDefault();
    setCreateFormError('');
    const uname = (newEnterpriseUsername || '').trim();
    if (!uname) {
      setCreateFormError('Vui lòng nhập tên đăng nhập!');
      return;
    }
    const isDuplicate = enterpriseUsersList.some(
      (u) => u.username && u.username.toLowerCase() === uname.toLowerCase()
    );
    if (isDuplicate) {
      setCreateFormError(`Tài khoản "${uname}" đã tồn tại trên hệ thống, vui lòng chọn tên đăng nhập khác!`);
      return;
    }
    await handleCreateEnterpriseUser(e);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
            Cấp phát tài khoản doanh nghiệp
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Phân quyền khép kín từng khâu chuỗi lạnh & Quản trị danh sách nhân sự
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CustomSelect
            value={userFilterRole}
            onChange={(val) => setUserFilterRole(val)}
            options={roleFilterOptions}
            size="sm"
            align="right"
          />
          <button
            type="button"
            onClick={loadEnterpriseUsers}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-950/10 bg-white dark:border-orange-500/20 dark:bg-[#1C140F] text-xs font-bold hover:text-[#F95716] shadow-sm transition-all cursor-pointer"
          >
            <Repeat size={13} /> Làm mới danh sách
          </button>
        </div>
      </div>

      {/* 1. DANH SÁCH TÀI KHOẢN DOANH NGHIỆP (NẰM PHÍA TRÊN, DẠNG THẺ 3 CỘT GIỐNG LÔ HÀNG, TỐI ĐA 12 TÀI KHOẢN/TRANG) */}
      <div className={`${CARD} space-y-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-orange-950/5 dark:border-orange-500/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F95716]/10 text-[#F95716]">
              <UserCheck size={20} />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Danh sách tài khoản doanh nghiệp ({filteredUsers.length})
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Hiển thị {paginatedUsers.length} / {filteredUsers.length} tài khoản &bull; Trang {safePage} / {totalPages}
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Tìm username, họ tên, SĐT, đơn vị..."
              className="w-full rounded-full border border-orange-950/10 bg-orange-950/[0.02] pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
            />
            <Search size={14} className="absolute left-3 top-2.5 text-neutral-400" />
          </div>
        </div>

        {/* Lưới 3 Thẻ 1 Hàng (Grid 3 Cột) */}
        {paginatedUsers.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-neutral-400">
            Không tìm thấy tài khoản nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedUsers.map((u) => {
              const roleCode = formatRoleName(u.role?.roleName || u.role);
              return (
                <div
                  key={u.userId || u.id || u.username}
                  onClick={() => setSelectedUserDetail(u)}
                  className="group relative p-5 rounded-2xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] hover:border-[#F95716] dark:hover:border-[#F95716] hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="font-mono text-xs font-black text-[#F95716] bg-orange-500/10 px-2.5 py-0.5 rounded-md">
                        @{u.username}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                          }`}
                        />
                        {u.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-[#1A1A1A] dark:text-[#F5F5F5] group-hover:text-[#F95716] transition-colors line-clamp-1">
                      {fixMojibake(u.fullName) || u.username}
                    </h4>

                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-neutral-400">Vai trò:</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F95716]/10 text-[#F95716]">
                          {roleCode}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-neutral-400">Đơn vị / Xe:</span>
                        <span className="font-mono font-bold text-neutral-700 dark:text-neutral-200 truncate max-w-[170px]">
                          {fixMojibake(u.assignedEntity || u.department) || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-neutral-400">Điện thoại:</span>
                        <span className="font-mono text-neutral-500 dark:text-neutral-400">
                          {fixMojibake(u.phone) || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-orange-950/5 dark:border-orange-500/10 flex items-center justify-between text-xs font-bold text-[#F95716]">
                    <span>Xem & chỉnh sửa hồ sơ</span>
                    <ArrowUpRight
                      size={14}
                      className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Thanh phân trang tài khoản (Tối đa 12 tài khoản / 1 trang) */}
        {totalPages > 1 && (
          <div className="pt-4 border-t border-orange-950/5 dark:border-orange-500/10 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Đang hiển thị tài khoản thứ <strong>{(safePage - 1) * USERS_PER_PAGE + 1}</strong> đến{' '}
              <strong>{Math.min(safePage * USERS_PER_PAGE, filteredUsers.length)}</strong> trong tổng số{' '}
              <strong>{filteredUsers.length}</strong> tài khoản
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:border-[#F95716] hover:text-[#F95716] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft size={14} /> Trang trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    pageNum === safePage
                      ? 'bg-[#F95716] text-white shadow-md shadow-orange-500/25'
                      : 'border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] text-neutral-600 dark:text-neutral-300 hover:border-[#F95716]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:border-[#F95716] hover:text-[#F95716] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                Trang tiếp theo <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. FORM CẤP PHÁT TÀI KHOẢN MỚI (NẰM PHÍA DƯỚI, KHÔNG TỰ ĐIỀN SẴN DỮ LIỆU) */}
      <div className={`${CARD} space-y-5`}>
        <div className="flex items-center gap-2.5 pb-3 border-b border-orange-950/5 dark:border-orange-500/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F95716]/10 text-[#F95716]">
            <Plus size={18} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
              Cấp phát tài khoản mới
            </h3>
            <p className="text-[11px] text-neutral-400">
              Khởi tạo tài khoản nhân sự mới theo từng vai trò trong chuỗi cung ứng
            </p>
          </div>
        </div>

        {createFormError && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400">
            ⚠️ {createFormError}
          </div>
        )}

        <form onSubmit={onSubmitNewUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1.5">
                Vai trò công tác *
              </label>
              <CustomSelect
                value={newEnterpriseRole}
                onChange={(val) => setNewEnterpriseRole(val)}
                options={createRoleOptions}
                className="w-full justify-between"
                popoverClassName="w-full"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1.5">
                Tên đăng nhập *
              </label>
              <input
                type="text"
                required
                value={newEnterpriseUsername}
                onChange={(e) => {
                  setNewEnterpriseUsername(e.target.value);
                  if (createFormError) setCreateFormError('');
                }}
                placeholder="Nhập tên đăng nhập..."
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs font-mono focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1.5">
                Mật khẩu khởi tạo *
              </label>
              <input
                type="password"
                required
                value={newEnterprisePassword}
                onChange={(e) => setNewEnterprisePassword(e.target.value)}
                placeholder="Nhập mật khẩu khởi tạo..."
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs font-mono focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1.5">
                Họ và tên cán bộ *
              </label>
              <input
                type="text"
                required
                value={newEnterpriseFullName}
                onChange={(e) => setNewEnterpriseFullName(e.target.value)}
                placeholder="Nhập họ và tên..."
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1.5">
                Số điện thoại
              </label>
              <input
                type="text"
                value={newEnterprisePhone}
                onChange={(e) => setNewEnterprisePhone(e.target.value)}
                placeholder="Nhập số điện thoại..."
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs font-mono focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1.5">
                Số căn cước (CCCD)
              </label>
              <input
                type="text"
                value={newEnterpriseIdentityCard}
                onChange={(e) => setNewEnterpriseIdentityCard(e.target.value)}
                placeholder="Nhập số CCCD..."
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs font-mono focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
          </div>

          {/* Trường Động Tùy Theo Vai Trò (Để trống hoàn toàn ban đầu, không tự điền sẵn biển số) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-orange-500/[0.03] border border-[#F95716]/15 space-y-2">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#F95716] flex items-center gap-1.5">
                {newEnterpriseRole === 'LOGISTICS_DRIVER' && (
                  <>
                    <Truck size={13} /> Thông tin phương tiện vận chuyển
                  </>
                )}
                {newEnterpriseRole === 'PRODUCER' && (
                  <>
                    <Layers size={13} /> Nông trại xuất xứ
                  </>
                )}
                {newEnterpriseRole === 'QC_INSPECTOR' && (
                  <>
                    <ShieldCheck size={13} /> Đơn vị kiểm định KCS
                  </>
                )}
                {newEnterpriseRole === 'INBOUND_GATE' && (
                  <>
                    <ShieldCheck size={13} /> Cổng tiếp nhận kho
                  </>
                )}
                {newEnterpriseRole === 'SHELF_OPERATOR' && (
                  <>
                    <Database size={13} /> Quầy kệ phụ trách
                  </>
                )}
                {newEnterpriseRole === 'CASHIER' && (
                  <>
                    <ShoppingCart size={13} /> Quầy thu ngân POS
                  </>
                )}
                {newEnterpriseRole === 'ADMIN' && (
                  <>
                    <ShieldCheck size={13} /> Phân ban quản trị
                  </>
                )}
              </span>
              <div>
                <label className="text-[10.5px] font-bold text-neutral-400 block mb-1">
                  {newEnterpriseRole === 'LOGISTICS_DRIVER' && 'Biển số xe điều khiển'}
                  {newEnterpriseRole === 'PRODUCER' && 'Tên nông trại / Mã VietGAP'}
                  {newEnterpriseRole === 'QC_INSPECTOR' && 'Trạm / Cổng KCS tiếp nhận'}
                  {newEnterpriseRole === 'INBOUND_GATE' && 'Cổng kho siêu thị phụ trách'}
                  {newEnterpriseRole === 'SHELF_OPERATOR' && 'Khu vực kệ hàng phân phối'}
                  {newEnterpriseRole === 'CASHIER' && 'Mã quầy POS thanh toán'}
                  {newEnterpriseRole === 'ADMIN' && 'Phòng công nghệ / Hạ tầng'}
                </label>
                <input
                  type="text"
                  value={newEnterpriseAssignedEntity}
                  onChange={(e) => setNewEnterpriseAssignedEntity(e.target.value)}
                  placeholder={
                    newEnterpriseRole === 'LOGISTICS_DRIVER'
                      ? 'Nhập biển số xe...'
                      : newEnterpriseRole === 'PRODUCER'
                      ? 'Nhập tên nông trại...'
                      : 'Nhập đơn vị phụ trách...'
                  }
                  className="w-full rounded-xl border border-orange-950/10 bg-white p-2.5 text-xs font-mono focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-[#1C140F]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1.5">
                Ghi chú vận hành
              </label>
              <textarea
                rows={3}
                value={newEnterpriseNotes}
                onChange={(e) => setNewEnterpriseNotes(e.target.value)}
                placeholder="Nhập ghi chú thêm về điều kiện vận hành (nếu có)..."
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#F95716] p-3.5 text-xs font-extrabold text-white shadow-[0_8px_20px_rgba(249,87,22,0.30)] hover:brightness-105 transition-all uppercase tracking-wider cursor-pointer"
          >
            Cấp phát tài khoản mới
          </button>
        </form>
      </div>
    </div>
  );
}
