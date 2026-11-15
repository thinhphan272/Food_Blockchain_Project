import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  QrCode,
  Power,
  Cpu,
  ArrowUpRight,
} from '../MomentumIcons';
import CustomSelect from './CustomSelect';

export default function DesktopHeader({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  searchQuery,
  setSearchQuery,
  searchHistory = [],
  isSearchHistoryOpen,
  setIsSearchHistoryOpen,
  handleExecuteSearch,
  handleClearSearchHistory,
  batches = [],
  selectedBatch,
  setSelectedBatch,
  currentUser,
  setShowUserProfileModal,
  handleLogout,
  isDark,
  handleToggleTheme,
}) {
  const searchContainerRef = useRef(null);

  // Close search history dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchHistoryOpen(false);
      }
    }
    if (isSearchHistoryOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchHistoryOpen, setIsSearchHistoryOpen]);

  // Options for CustomSelect batch dropdown
  const batchOptions = batches.map((b) => ({
    value: b.batch_code,
    label: b.batch_code,
    subLabel: b.product_name,
  }));

  return (
    <header className="sticky top-0 z-30 hidden items-center gap-3 border-b border-orange-950/5 bg-[#F6F3F0]/80 px-6 py-4 backdrop-blur-xl dark:border-orange-500/10 dark:bg-[#120C08]/80 lg:flex">
      {/* Nút Ẩn / Hiện Thanh Điều Hướng Sidebar DUY NHẤT (Không bị nhân đôi) */}
      <button
        type="button"
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        title={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-950/5 bg-white text-neutral-500 shadow-sm hover:border-[#F95716]/40 hover:text-[#F95716] dark:border-orange-500/10 dark:bg-[#1C140F] dark:text-neutral-300 transition-all cursor-pointer"
      >
        {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Global Search Pill with Interactive History */}
      <div className="relative flex-1 max-w-[420px]" ref={searchContainerRef}>
        <div className="flex items-center gap-2 rounded-full border border-orange-950/5 bg-white px-3.5 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-within:border-[#F95716]/60 dark:border-orange-500/10 dark:bg-[#1C140F] transition-all">
          <Search size={16} className="text-neutral-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchHistoryOpen(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleExecuteSearch(searchQuery);
              }
            }}
            placeholder="Tìm kiếm mã lô hàng, sản phẩm, xe lạnh..."
            className="w-full bg-transparent text-[13px] font-medium text-[#1A1A1A] placeholder:text-neutral-400 focus:outline-none dark:text-[#F5F5F5]"
          />
          {searchQuery && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (handleExecuteSearch) handleExecuteSearch('');
                }}
                className="text-[11px] font-bold text-neutral-400 hover:text-neutral-600 px-1.5 py-0.5 rounded-full transition-colors"
                title="Xóa từ khóa tìm kiếm"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() => handleExecuteSearch(searchQuery)}
                className="text-[11px] font-bold text-[#F95716] px-2 py-0.5 rounded-full hover:bg-orange-500/10 transition-colors"
              >
                Tìm
              </button>
            </div>
          )}
        </div>

        {/* Lịch sử tìm kiếm thông minh */}
        {isSearchHistoryOpen && searchHistory.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-orange-950/10 bg-white/95 p-3 shadow-xl backdrop-blur-xl dark:border-orange-500/20 dark:bg-[#1C140F]/95 z-50 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-orange-950/5 dark:border-orange-500/10 text-[11px] font-bold text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Clock size={13} /> Lịch sử tìm kiếm gần đây
              </span>
              <button
                type="button"
                onClick={handleClearSearchHistory}
                className="hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> Xóa
              </button>
            </div>
            <div className="space-y-1">
              {searchHistory.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleExecuteSearch(item)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-orange-500/10 hover:text-[#F95716] cursor-pointer transition-colors"
                >
                  <span className="truncate">{item}</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Nhấn để xem</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hiển thị Mã lô đang chọn (Không sổ menu xuống - việc chọn lô thực hiện tại Trang Tổng Quan) */}
      <div className="hidden xl:flex items-center">
        <div
          className={`flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-bold shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all ${
            selectedBatch?.batch_code
              ? 'border-[#F95716]/30 bg-white dark:bg-[#1C140F] text-[#1A1A1A] dark:text-[#F5F5F5]'
              : 'border-orange-950/5 bg-white/80 dark:border-orange-500/10 dark:bg-[#1C140F]/80 text-neutral-400'
          }`}
          title={
            selectedBatch?.batch_code
              ? `Đang chọn lô: ${selectedBatch.batch_code} (${selectedBatch.product_name || ''})`
              : 'Vui lòng vào Trang Tổng Quan để chọn lô hàng'
          }
        >
          <span
            className={`h-2 w-2 rounded-full ${
              selectedBatch?.batch_code ? 'bg-[#F95716] animate-pulse' : 'bg-neutral-300 dark:bg-neutral-600'
            }`}
          />
          {selectedBatch?.batch_code ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-black text-[#F95716]">{selectedBatch.batch_code}</span>
              {selectedBatch.product_name && (
                <span className="text-neutral-500 dark:text-neutral-400 font-medium truncate max-w-[160px]">
                  &bull; {selectedBatch.product_name}
                </span>
              )}
            </div>
          ) : (
            <span>Chưa chọn lô hàng</span>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="ml-auto flex items-center gap-3">
        {/* User Card Pill */}
        <div
          onClick={() => setShowUserProfileModal(true)}
          title="Bấm để xem hồ sơ tài khoản và phân quyền"
          className="flex items-center gap-2 rounded-full border border-orange-950/5 bg-white pl-2 pr-3 py-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F] cursor-pointer hover:border-[#F95716]/40 transition-all"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F95716] text-white text-[11px] font-extrabold uppercase">
            {(currentUser?.fullName || currentUser?.username || 'U').slice(0, 1)}
          </span>
          <div className="text-left leading-tight pr-1">
            <div className="text-[12px] font-bold text-[#1A1A1A] dark:text-[#F5F5F5] truncate max-w-[120px]">
              {currentUser?.fullName || currentUser?.username}
            </div>
            <div className="text-[9.5px] font-semibold text-[#F95716]">
              {currentUser?.role}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            title="Đăng xuất khỏi hệ thống"
            className="ml-1 p-1.5 rounded-full text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Power size={14} />
          </button>
        </div>

        {/* Theme Toggle Pill */}
        <button
          type="button"
          onClick={handleToggleTheme}
          aria-label={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-950/5 bg-white text-[#1A1A1A] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:scale-105 active:scale-95 transition-all dark:border-orange-500/10 dark:bg-[#1C140F] dark:text-[#F5F5F5]"
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
        </button>

        {/* Nút Cổng Tra Cứu Tem */}
        <Link
          to={`/trace/${selectedBatch?.batch_code || 'LOT-VEG-2026-001'}`}
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#F95716] text-white text-xs font-bold shadow-[0_8px_20px_rgba(249,87,22,0.30)] hover:brightness-105 active:scale-95 transition-all"
        >
          <QrCode size={14} />
          <span>Cổng tra cứu</span>
          <ArrowUpRight size={14} className="opacity-80" />
        </Link>
      </div>
    </header>
  );
}

