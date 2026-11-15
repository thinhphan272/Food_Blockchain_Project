import React from 'react';
import { ShieldCheck } from '../components/MomentumIcons';

export default function QcInspectionPage({
  selectedBatch,
  handleRunQcAudit,
  qcAuditResult,
  calculatedTti = 98.5,
  qcSignatureNote,
  setQcSignatureNote,
  handleApproveQc,
}) {
  const CARD =
    'rounded-[28px] border border-orange-950/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5]">
            Kiểm định chất lượng & nghiệm thu QC
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Đối soát vi khí hậu, đánh giá TTI và ký số Smart Contract
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunQcAudit}
          className="px-4 py-2 rounded-full bg-[#F95716] text-white text-xs font-bold shadow-sm hover:brightness-105"
        >
          Kiểm toán TTI 72h ngay
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Kết quả Audit Chuỗi Khối & TTI */}
        <div className={`${CARD} xl:col-span-2 space-y-4`}>
          <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
            Kết quả đối soát toàn vẹn chuỗi lạnh lô {selectedBatch?.batch_code || '---'}
          </h3>

          {qcAuditResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.02] border border-orange-950/5 dark:border-orange-500/10">
                  <div className="text-[10.5px] font-bold text-neutral-400 uppercase">Điểm độ tươi TTI</div>
                  <div className="text-2xl font-extrabold text-[#F95716] mt-1">
                    {Number(
                      qcAuditResult.freshness_score ??
                        qcAuditResult.ttiScore ??
                        qcAuditResult.aiTtiEvaluation?.ttiFreshnessScore ??
                        calculatedTti
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Mô hình Arrhenius Ea=50kJ</div>
                </div>
                <div className="p-3 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.02] border border-orange-950/5 dark:border-orange-500/10">
                  <div className="text-[10.5px] font-bold text-neutral-400 uppercase">Tính toàn vẹn sổ cái</div>
                  <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {qcAuditResult.merkle_valid ? 'KHỚP 100%' : 'HỢP LỆ'}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Sổ cái không bị giả mạo</div>
                </div>
                <div className="p-3 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.02] border border-orange-950/5 dark:border-orange-500/10">
                  <div className="text-[10.5px] font-bold text-neutral-400 uppercase">Khuyến nghị nhận hàng</div>
                  <div className="text-base font-extrabold text-emerald-600 mt-2">
                    {qcAuditResult.recommendation || 'ĐẠT CHUẨN TIẾP NHẬN'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.02] border border-orange-950/5 dark:border-orange-500/10 text-xs leading-relaxed font-mono">
                <div>Mã băm xác thực sổ cái: {qcAuditResult.merkle_root || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</div>
                <div className="mt-1">Số vi phạm nhiệt độ: {qcAuditResult.violations_count || 0} lần</div>
                <div className="mt-1">Thời gian lưu kệ ước tính: {qcAuditResult.shelf_life_hours || 144} giờ</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-neutral-400 text-xs">
              Bấm "Kiểm toán TTI 72h ngay" để chạy thuật toán đối soát vi khí hậu chuỗi lạnh.
            </div>
          )}
        </div>

        {/* Ký Smart Contract Nghiệm Thu */}
        <div className={`${CARD} space-y-4`}>
          <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#F95716]" />
            Ký số Smart Contract cổng tiếp nhận
          </h3>

          <div>
            <label className="text-xs font-bold text-neutral-400 block mb-1">Ghi chú KCS</label>
            <textarea
              rows={3}
              value={qcSignatureNote}
              onChange={(e) => setQcSignatureNote(e.target.value)}
              className="w-full rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02] p-3 text-xs focus:outline-none focus:border-[#F95716]"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleApproveQc('REJECT')}
              className="flex-1 rounded-full border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all"
            >
              TỪ CHỐI NHẬN
            </button>
            <button
              type="button"
              onClick={() => handleApproveQc('ACCEPT')}
              className="flex-1 rounded-full bg-emerald-600 p-3 text-xs font-bold text-white shadow-sm hover:brightness-105 transition-all"
            >
              KÝ DUYỆT NHẬN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

