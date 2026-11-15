import React from 'react';
import { Link } from 'react-router-dom';
import {
  QrCode,
  ArrowUpRight,
  AlertTriangle,
  Box,
} from '../components/MomentumIcons';
import { resolveFoodBatchMedia, CONSUMER_LOGIN_BG } from '../utils/foodMediaResolver';

export default function BlockchainTracePage({
  batches = [],
  onSelectBatch,
  currentUser,
  selectedBatch,
  recallReason,
  setRecallReason,
  handleEmergencyRecall,
  recallResult,
}) {
  const CARD =
    'rounded-[28px] border border-orange-950/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]';

  const hasSelectedBatch = Boolean(selectedBatch?.batch_code);
  const selectedMedia = hasSelectedBatch ? resolveFoodBatchMedia(selectedBatch) : null;
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
            Minh Bạch Sổ Cái Blockchain & Lệnh Thu Hồi Khẩn Cấp
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Tra cứu toàn bộ thông tin mã hóa ECDSA và phân tích phả hệ chuỗi cung ứng bằng đồ thị Neo4j
          </p>
        </div>
      </div>

      {/* THANH CHỌN LÔ HÀNG TRA CỨU */}
      {batches.length > 0 && (
        <div className={`${CARD} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
              Chọn lô hàng tra cứu ({batches.length} lô):
            </span>
            <span className="text-xs font-mono font-bold text-[#F95716]">
              Đang chọn: {selectedBatch?.batch_code || 'Chưa chọn'}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {batches.map((b) => {
              const isSelected = selectedBatch?.batch_code === b.batch_code;
              const isRecalled = String(b.status || '').includes('RECALL');

              return (
                <button
                  type="button"
                  key={b.batch_code}
                  onClick={() => onSelectBatch && onSelectBatch(b)}
                  className={`p-3 rounded-2xl border text-left min-w-[200px] shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#F95716] bg-[#F95716]/[0.06] shadow-sm'
                      : 'border-orange-950/5 dark:border-orange-500/10 hover:border-[#F95716]/30 bg-orange-950/[0.01]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-mono font-bold text-[#F95716]">{b.batch_code}</span>
                    {isRecalled && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white font-bold">
                        ĐÃ THU HỒI
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] truncate mt-1">
                    {b.product_name || b.productName}
                  </div>
                  <div className="text-[10.5px] text-neutral-400 truncate mt-0.5">
                    {b.farm_name || b.farmName}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Cổng tra cứu khách hàng (Có hình nền đồng bộ với Login Khách hàng) */}
        <div className="relative overflow-hidden rounded-[28px] border border-orange-950/10 dark:border-orange-500/20 shadow-[0_12px_36px_rgba(0,0,0,0.08)] p-6 sm:p-7 text-white flex flex-col justify-between min-h-[260px]">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src={CONSUMER_LOGIN_BG}
              alt="SmartChain Consumer Portal Background"
              className="w-full h-full object-cover object-center filter brightness-[0.8] contrast-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/90 via-black/75 to-[#F95716]/45" />
          </div>

          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F95716] text-white shadow-md">
                <QrCode size={18} />
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                Cổng thông tin khách hàng (Public Traceability)
              </h3>
            </div>
            <p className="text-xs text-white/85 leading-relaxed">
              Mở giao diện tra cứu dành cho người tiêu dùng quét mã QR tại siêu thị để kiểm tra chứng nhận VietGAP, biểu đồ nhiệt độ 72h và chữ ký số ECDSA.
            </p>
          </div>

          <div className="relative z-10 mt-5">
            {!hasSelectedBatch ? (
              <div className="p-5 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/20 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#F95716]/25 text-[#F95716] flex items-center justify-center mx-auto border border-[#F95716]/40">
                  <Box size={18} />
                </div>
                <div className="text-xs font-bold text-white">
                  Chưa chọn lô hàng
                </div>
                <p className="text-[11px] text-white/75">
                  Vui lòng chọn một lô hàng tại Trang Tổng Quan để hiển thị đường dẫn tra cứu nguồn gốc tương ứng.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/25 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="h-14 w-14 rounded-2xl overflow-hidden border border-white/30 shrink-0 shadow-md">
                    <img
                      src={selectedMedia.thumb}
                      alt={selectedBatch.product_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-[11px] text-white/75">Đường dẫn truy xuất lô hiện tại</div>
                    <div className="text-xs font-mono font-bold text-amber-300 mt-0.5">
                      /trace/{selectedBatch.batch_code}
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      {selectedBatch.product_name}
                    </div>
                  </div>
                </div>
                <Link
                  to={`/trace/${selectedBatch.batch_code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#F95716] hover:bg-[#E0430B] text-white text-xs font-extrabold shadow-lg hover:scale-105 transition-all shrink-0"
                >
                  <span>Mở cổng tra cứu</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Recall */}
        <div className={`${CARD} space-y-4 border-red-500/20`}>
          <div className="flex items-center gap-2 text-red-500">
            <AlertTriangle size={18} />
            <h3 className="text-base font-bold">Lệnh Thu Hồi Khẩn Cấp</h3>
          </div>

          {!hasSelectedBatch ? (
            <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-dashed border-neutral-300 dark:border-neutral-800 text-center space-y-2">
              <div className="text-xs font-bold text-neutral-500 dark:text-neutral-300">
                Chưa chọn lô hàng
              </div>
              <p className="text-[11px] text-neutral-400">
                Vui lòng chọn lô hàng cần thu hồi tại Trang Tổng Quan trước khi kích hoạt lệnh thu hồi.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-red-500/[0.05] border border-red-500/20">
                <span className="text-neutral-500 dark:text-neutral-300">Lô hàng mục tiêu:</span>
                <strong className="font-mono text-red-600 dark:text-red-400">
                  {selectedBatch.batch_code} ({selectedBatch.product_name})
                </strong>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1.5">
                  Lý do thu hồi khẩn cấp *
                </label>
                <input
                  type="text"
                  value={recallReason}
                  onChange={(e) => setRecallReason(e.target.value)}
                  placeholder="Nhập lý do thu hồi khẩn cấp..."
                  className="w-full rounded-2xl border border-red-500/20 bg-red-500/[0.02] p-3 text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                type="button"
                disabled={!recallReason || !recallReason.trim()}
                onClick={handleEmergencyRecall}
                className="w-full rounded-2xl bg-red-500 p-3.5 text-xs font-extrabold text-white shadow-lg shadow-red-500/25 hover:bg-red-600 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                PHÁT LỆNH THU HỒI TOÀN HỆ THỐNG
              </button>

              {recallResult && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs space-y-1.5">
                  <div className="font-extrabold text-red-500">
                    ĐÃ PHONG TỎA LÔ HÀNG ({selectedBatch.batch_code})
                  </div>
                  <div className="text-neutral-600 dark:text-neutral-300">
                    Các điểm bán bị ảnh hưởng:{' '}
                    <strong>
                      {(
                        recallResult.affectedStores ||
                        recallResult.neo4jRecallReport?.affectedSupermarkets || [
                          'Co.opMart Tân Phú',
                          'BigC Miền Đông',
                        ]
                      ).join(', ')}
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
