import React from 'react';
import { SmartChainCube } from '../MomentumIcons';

export default function Sidebar({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  activeTab,
  setActiveTab,
  navItems = [],
  currentUser,
  setShowUserProfileModal,
}) {
  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-orange-950/5 bg-white/60 py-6 transition-all duration-300 ease-in-out dark:border-orange-500/10 dark:bg-white/[0.02] lg:flex ${
        isSidebarCollapsed ? 'w-[78px] px-3' : 'w-[260px] px-5'
      }`}
    >
      {/* Brand Logo - Không đặt nút mũi tên trùng lặp ở đây để tránh bị 2 nút cạnh nhau */}
      <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'px-2'}`}>
        <div
          onClick={() => isSidebarCollapsed && setIsSidebarCollapsed(false)}
          className="flex items-center gap-3 cursor-pointer group"
          title={isSidebarCollapsed ? 'Bấm để mở rộng menu' : undefined}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F95716] text-white shadow-[0_8px_20px_rgba(249,87,22,0.35)] group-hover:scale-105 transition-all">
            <SmartChainCube size={20} />
          </span>
          {!isSidebarCollapsed && (
            <div className="leading-tight min-w-0">
              <p className="text-[15px] font-extrabold tracking-tight text-[#1A1A1A] dark:text-[#F5F5F5] truncate">
                SmartChain
              </p>
              <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 truncate">
                Enterprise Cold-Chain
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      {!isSidebarCollapsed && (
        <p className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
          Phân hệ hệ thống
        </p>
      )}
      <nav className={`space-y-1.5 ${isSidebarCollapsed ? 'mt-6' : 'mt-2'}`}>
        {navItems.map((item) => {
          const active = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`flex w-full items-center rounded-2xl py-2.5 text-[13px] font-semibold transition-all ${
                isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-3'
              } ${
                active
                  ? 'bg-[#F95716] text-white shadow-[0_8px_20px_rgba(249,87,22,0.30)]'
                  : 'text-neutral-500 hover:bg-orange-950/[0.04] hover:text-[#1A1A1A] dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                        active
                          ? 'bg-white/25 text-white'
                          : 'bg-orange-950/5 text-neutral-500 dark:bg-white/10 dark:text-neutral-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Thông Tin Người Dùng & Phân Quyền */}
      <div
        onClick={() => setShowUserProfileModal(true)}
        title="Bấm để xem hồ sơ tài khoản và phân quyền"
        className={`mt-6 rounded-2xl border border-orange-950/5 bg-orange-950/[0.02] p-2.5 dark:border-orange-500/10 dark:bg-white/[0.02] cursor-pointer hover:border-[#F95716]/40 hover:bg-orange-500/[0.04] transition-all ${
          isSidebarCollapsed ? 'flex justify-center' : ''
        }`}
      >
        <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F95716]/10 text-[#F95716] text-[11px] font-bold uppercase">
            {(currentUser?.fullName || currentUser?.username || 'AD').slice(0, 2)}
          </span>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                {currentUser?.fullName || currentUser?.username || 'Người dùng'}
              </p>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-950/[0.05] dark:bg-white/10 text-[#F95716]">
                {currentUser?.role || 'CONSUMER'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status Box */}
      <div className="mt-auto rounded-2xl border border-orange-950/5 bg-orange-950/[0.02] p-2.5 text-center dark:border-orange-500/10 dark:bg-white/[0.02]">
        <div className="flex items-center justify-center gap-2 text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          {!isSidebarCollapsed && <span className="truncate">Hệ thống trực tuyến</span>}
        </div>
      </div>
    </aside>
  );
}

