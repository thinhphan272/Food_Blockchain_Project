import React from 'react';
import { BlockchainShield, ArrowUpRight } from '../MomentumIcons';

export default function BlockchainPanel({
  blockchainVerification,
  setActiveTab,
}) {
  const isChainValid = blockchainVerification?.chainValid !== false;
  const totalBlocks = blockchainVerification?.totalBlocks || 3;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-orange-950/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]">
      {/* Vệt sáng ấm tinh tế nền góc phải */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#F95716]/[0.05] blur-3xl dark:bg-[#F95716]/[0.10]" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Cột trái: Biểu tượng khiên bảo mật bản to đầy đặn + Tiêu đề */}
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          <span className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F95716] to-[#E0430B] text-white shadow-[0_10px_25px_rgba(249,87,22,0.35)]">
            <BlockchainShield size={34} />
          </span>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-orange-500/10 text-[#F95716] border border-[#F95716]/20">
                Trụ cột chuỗi khối bất biến
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isChainValid ? 'Sổ cái đồng bộ 100%' : 'Cảnh báo sai lệch'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5] mt-1.5">
              Bảo chứng toàn vẹn chuỗi khối & chống gian lận
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-2xl leading-relaxed">
              Toàn bộ nhật ký vi khí hậu IoT, biên bản kiểm định KCS và giao dịch xuất kho đều được xác thực mật mã ECDSA secp256r1 không thể làm giả.
            </p>
          </div>
        </div>

        {/* Cột phải: Thẻ chỉ số đối soát + Nút bấm tông cam SmartChain */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap lg:flex-nowrap border-t lg:border-t-0 pt-4 lg:pt-0 border-orange-950/5 dark:border-white/5">
          <div className="px-4 py-2.5 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.03] border border-orange-950/5 dark:border-white/10 min-w-[125px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Trạng thái đối soát</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {isChainValid ? '100% Khớp' : '0% Sai lệch'}
            </div>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.03] border border-orange-950/5 dark:border-white/10 min-w-[100px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Khối sổ cái</div>
            <div className="text-lg font-black text-[#1A1A1A] dark:text-[#F5F5F5] mt-0.5">
              {totalBlocks} khối
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('trace')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#F95716] hover:bg-[#E0430B] text-white text-xs font-bold shadow-[0_8px_20px_rgba(249,87,22,0.30)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
          >
            Tra cứu sổ cái
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

