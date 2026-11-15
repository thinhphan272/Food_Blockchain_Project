import React from 'react';
import { Trash2 } from '../../MomentumIcons';

function cleanText(str) {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/Thá»‹nh/g, 'Thịnh')
    .replace(/Há»£p TÃ¡c XÃ£ Rau Ä[\s\S]*?Láº¡t/g, 'Hợp Tác Xã Rau Đà Lạt')
    .replace(/Thu NgÃ¢n Quáº§y 1 TÃ¢n PhÃº/g, 'Thu Ngân Quầy 1 Tân Phú');
}

function formatRole(role) {
  const r = (typeof role === 'object' ? role?.roleName : role) || 'LOGISTICS_DRIVER';
  if (r === 'ROLE_ADMIN') return 'ADMIN';
  if (r === 'ROLE_SUPPLIER') return 'PRODUCER';
  if (r === 'ROLE_POS') return 'CASHIER';
  if (r === 'ROLE_DRIVER') return 'LOGISTICS_DRIVER';
  if (r === 'ROLE_QC') return 'QC_INSPECTOR';
  return r.replace(/^ROLE_/, '');
}

export default function UserDetailModal({
  selectedUserDetail,
  setSelectedUserDetail,
  handleToggleStatus,
  handleDeleteEnterpriseUser,
  handleSaveUserDetail,
}) {
  if (!selectedUserDetail) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-[32px] border border-orange-950/10 bg-white p-7 shadow-2xl dark:border-orange-500/20 dark:bg-[#1C140F]">
        <div className="flex items-center justify-between pb-4 border-b border-orange-950/10 dark:border-orange-500/10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F95716] text-white font-extrabold text-base">
              {(selectedUserDetail.fullName || selectedUserDetail.username || 'U').slice(0, 1)}
            </span>
            <div>
              <h3 className="text-base font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Chi tiết tài khoản #{selectedUserDetail.id || selectedUserDetail.username}
              </h3>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F95716]/10 text-[#F95716]">
                {formatRole(selectedUserDetail.role?.roleName || selectedUserDetail.role)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedUserDetail(null)}
            className="text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white p-1 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSaveUserDetail} className="mt-5 space-y-3.5 text-xs">
          <div>
            <label className="text-neutral-400 font-bold block mb-1">Tên đăng nhập (Bất biến)</label>
            <input
              type="text"
              disabled
              value={selectedUserDetail.username}
              className="w-full rounded-2xl border border-orange-950/10 bg-neutral-100 p-2.5 font-mono text-xs dark:border-orange-500/10 dark:bg-neutral-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-neutral-400 font-bold block mb-1">Họ và tên</label>
              <input
                type="text"
                value={selectedUserDetail.fullName || ''}
                onChange={(e) => setSelectedUserDetail({ ...selectedUserDetail, fullName: e.target.value })}
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-bold block mb-1">Số điện thoại</label>
              <input
                type="text"
                value={selectedUserDetail.phone || ''}
                onChange={(e) => setSelectedUserDetail({ ...selectedUserDetail, phone: e.target.value })}
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-neutral-400 font-bold block mb-1">Phòng ban / Đơn vị</label>
              <input
                type="text"
                value={selectedUserDetail.department || ''}
                onChange={(e) => setSelectedUserDetail({ ...selectedUserDetail, department: e.target.value })}
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-bold block mb-1">Căn cước / CCCD</label>
              <input
                type="text"
                value={selectedUserDetail.identityCard || ''}
                onChange={(e) => setSelectedUserDetail({ ...selectedUserDetail, identityCard: e.target.value })}
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
          </div>

          <div>
            <label className="text-neutral-400 font-bold block mb-1">Đơn vị / Phương tiện phụ trách</label>
            <input
              type="text"
              value={selectedUserDetail.assignedEntity || ''}
              onChange={(e) => setSelectedUserDetail({ ...selectedUserDetail, assignedEntity: e.target.value })}
              className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-neutral-400 font-bold">Trạng thái tài khoản:</span>
            <button
              type="button"
              onClick={() => handleToggleStatus(selectedUserDetail.username, selectedUserDetail.isActive)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                selectedUserDetail.isActive
                  ? 'bg-emerald-500/10 text-emerald-600 hover:bg-red-500/10 hover:text-red-500'
                  : 'bg-red-500/10 text-red-500 hover:bg-emerald-500/10 hover:text-emerald-600'
              }`}
            >
              {selectedUserDetail.isActive ? 'Đang hoạt động (Click để khóa)' : 'Đang bị khóa (Click để mở)'}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-orange-950/10 dark:border-orange-500/10 flex gap-3">
            <button
              type="button"
              onClick={() => handleDeleteEnterpriseUser(selectedUserDetail.username)}
              className="px-4 py-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Trash2 size={13} /> Xóa tài khoản
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-2xl bg-[#F95716] text-xs font-bold text-white shadow-sm hover:brightness-105 transition-all"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

