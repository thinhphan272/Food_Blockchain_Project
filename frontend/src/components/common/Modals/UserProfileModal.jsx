import React from 'react';

export default function UserProfileModal({
  showUserProfileModal,
  setShowUserProfileModal,
  currentUser,
  handleLogout,
}) {
  if (!showUserProfileModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-[32px] border border-orange-950/10 bg-white p-7 shadow-2xl dark:border-orange-500/20 dark:bg-[#1C140F]">
        <div className="flex items-center justify-between pb-4 border-b border-orange-950/10 dark:border-orange-500/10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F95716] text-white font-extrabold text-base shadow-[0_8px_20px_rgba(249,87,22,0.35)]">
              {(currentUser?.fullName || currentUser?.username || 'U').slice(0, 1)}
            </span>
            <div>
              <h3 className="text-base font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Hồ sơ tài khoản của bạn
              </h3>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F95716]/10 text-[#F95716]">
                {currentUser?.role}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowUserProfileModal(false)}
            className="text-neutral-400 hover:text-[#1A1A1A] dark:hover:text-white p-1 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="mt-5 space-y-3.5 text-xs">
          <div className="flex justify-between py-2 border-b border-orange-950/5 dark:border-orange-500/5">
            <span className="text-neutral-400 font-semibold">Tên đăng nhập:</span>
            <span className="font-mono font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{currentUser?.username}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-orange-950/5 dark:border-orange-500/5">
            <span className="text-neutral-400 font-semibold">Họ và tên:</span>
            <span className="font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{currentUser?.fullName || '—'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-orange-950/5 dark:border-orange-500/5">
            <span className="text-neutral-400 font-semibold">Phòng ban / đơn vị:</span>
            <span className="font-semibold text-neutral-600 dark:text-neutral-300">{currentUser?.department || '—'}</span>
          </div>
          {currentUser?.phone && (
            <div className="flex justify-between py-2 border-b border-orange-950/5 dark:border-orange-500/5">
              <span className="text-neutral-400 font-semibold">Số điện thoại:</span>
              <span className="font-mono font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{currentUser.phone}</span>
            </div>
          )}
          {currentUser?.identityCard && (
            <div className="flex justify-between py-2 border-b border-orange-950/5 dark:border-orange-500/5">
              <span className="text-neutral-400 font-semibold">Số căn cước (CCCD):</span>
              <span className="font-mono font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{currentUser.identityCard}</span>
            </div>
          )}
          {currentUser?.assignedEntity && (
            <div className="flex justify-between py-2 border-b border-orange-950/5 dark:border-orange-500/5">
              <span className="text-neutral-400 font-semibold">Đơn vị / phương tiện:</span>
              <span className="font-mono font-extrabold text-[#F95716]">{currentUser.assignedEntity}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-orange-950/5 dark:border-orange-500/5">
            <span className="text-neutral-400 font-semibold">Trạng thái xác thực:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              JWT Bảo Mật Đang Hoạt Động
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowUserProfileModal(false);
              handleLogout();
            }}
            className="flex-1 rounded-2xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all"
          >
            Đăng xuất
          </button>
          <button
            type="button"
            onClick={() => setShowUserProfileModal(false)}
            className="flex-1 rounded-2xl bg-[#F95716] py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-105 transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

