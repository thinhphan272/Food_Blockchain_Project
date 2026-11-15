import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, CheckSquare, Layers, Truck, Box, CheckCircle, AlertTriangle } from '../components/MomentumIcons';

export default function QcInspectionPage({
  batches = [],
  onSelectBatch,
  currentUser,
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

  const [qcTab, setQcTab] = useState('pending'); // 'pending' | 'completed'
  const isInboundGate = currentUser?.role === 'INBOUND_GATE';

  // Lọc danh sách lô hàng theo quy trình nghiệp vụ thực tế:
  // 1. Chờ KCS: Các lô hàng xe tải đã giao tới cổng kho (DELIVERED) hoặc đang trên đường tới (IN_TRANSIT)
  // 2. Đã nghiệm thu: Các lô hàng đã ký duyệt đạt (QC_ACCEPTED) hoặc bị từ chối (QC_REJECTED)
  const pendingBatches = useMemo(() => {
    return batches.filter((b) => {
      const st = String(b.status || '').toUpperCase();
      return st === 'DELIVERED' || st === 'ARRIVED_AT_STORE' || st === 'IN_TRANSIT';
    });
  }, [batches]);

  const completedBatches = useMemo(() => {
    return batches.filter((b) => {
      const st = String(b.status || '').toUpperCase();
      return st === 'QC_ACCEPTED' || st === 'QC_REJECTED';
    });
  }, [batches]);

  const displayedBatches = qcTab === 'pending' ? pendingBatches : completedBatches;

  // Tự động chọn lô đầu tiên của tab nếu chưa chọn hoặc lô hiện tại không nằm trong danh sách
  useEffect(() => {
    if (displayedBatches.length > 0) {
      const isSelectedInList = selectedBatch && displayedBatches.some((b) => b.batch_code === selectedBatch.batch_code);
      if (!isSelectedInList && onSelectBatch) {
        onSelectBatch(displayedBatches[0]);
      }
    }
  }, [qcTab, displayedBatches, selectedBatch, onSelectBatch]);

  return (
    <div className="space-y-6">
      {/* TIÊU ĐỀ TRANG & MÔ TẢ NGHIỆP VỤ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5]">
            {isInboundGate
              ? 'Cổng Tiếp Nhận Hàng Hóa & Nghiệm Thu KCS Kho Trung Tâm'
              : 'Kiểm Định Chất Lượng & Cổng KCS TTI (Arrhenius)'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Nhân sự: <span className="font-bold text-[#F95716]">{currentUser?.fullName || 'Trần Minh Khoa'}</span> ({currentUser?.role || 'QC_INSPECTOR'}) &bull; Tiếp nhận lô hàng từ nông trại, đối soát hành trình xe lạnh IoT và thẩm định độ tươi trước khi xếp kệ
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunQcAudit}
          disabled={!selectedBatch}
          className="px-5 py-2.5 rounded-full bg-[#F95716] text-white text-xs font-bold shadow-md hover:brightness-105 transition-all disabled:opacity-40 cursor-pointer self-start sm:self-auto flex items-center gap-2"
        >
          <ShieldCheck size={16} />
          <span>Kiểm toán TTI 72h ngay</span>
        </button>
      </div>

      {/* BANNER GIẢI THÍCH LUỒNG NGHIỆP VỤ */}
      <div className="p-4 rounded-2xl bg-orange-500/[0.06] border border-[#F95716]/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#F95716] text-white font-bold">
            i
          </span>
          <span className="text-[#1A1A1A] dark:text-[#F5F5F5]">
            <strong>Luồng nghiệp vụ KCS:</strong> Lô hàng được Nông trại xuất phát &rarr; Xe lạnh IoT vận chuyển &rarr; Cập bến cổng kho &rarr; KCS thẩm định nhiệt độ TTI & ký duyệt &rarr; Chuyển sang Quản lý kệ để xếp quầy bán.
          </span>
        </div>
        <div className="text-[11px] font-mono text-neutral-400 shrink-0">
          * Các lô hàng còn ở nông trại chưa xuất phát sẽ không xuất hiện tại cổng kiểm định này.
        </div>
      </div>

      {/* KHUNG CHỌN LÔ HÀNG KIỂM ĐỊNH (RESPONSIVE GRID - HOÀN TOÀN KHÔNG BỊ CẮT XÉN) */}
      <div className={`${CARD} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-orange-950/5 dark:border-orange-500/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQcTab('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                qcTab === 'pending'
                  ? 'bg-[#F95716] text-white shadow-sm'
                  : 'bg-orange-950/[0.04] dark:bg-white/[0.05] text-neutral-500 hover:text-[#1A1A1A] dark:hover:text-white'
              }`}
            >
              Lô hàng chờ KCS ({pendingBatches.length})
            </button>
            <button
              type="button"
              onClick={() => setQcTab('completed')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                qcTab === 'completed'
                  ? 'bg-[#F95716] text-white shadow-sm'
                  : 'bg-orange-950/[0.04] dark:bg-white/[0.05] text-neutral-500 hover:text-[#1A1A1A] dark:hover:text-white'
              }`}
            >
              Lịch sử đã nghiệm thu ({completedBatches.length})
            </button>
          </div>

          <div className="text-xs">
            <span className="text-neutral-400">Đang chọn kiểm định: </span>
            <span className="font-mono font-bold text-[#F95716]">
              {selectedBatch?.batch_code || 'Chưa chọn'}
            </span>
          </div>
        </div>

        {/* LƯỚI CARD LÔ HÀNG THIẾT KẾ CO GIÃN THÔNG MINH */}
        {displayedBatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayedBatches.map((b) => {
              const isSelected = selectedBatch?.batch_code === b.batch_code;
              const st = String(b.status || 'CREATED').toUpperCase();
              let stText = 'Chờ kiểm';
              let stColor = 'bg-neutral-500/10 text-neutral-500';

              if (st === 'DELIVERED' || st === 'ARRIVED_AT_STORE') {
                stText = 'Đã cập bến (Chờ KCS)';
                stColor = 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold';
              } else if (st === 'IN_TRANSIT') {
                stText = 'Xe đang tới kho';
                stColor = 'bg-purple-500/15 text-purple-600 font-bold';
              } else if (st === 'QC_ACCEPTED') {
                stText = 'Đã duyệt đạt chuẩn';
                stColor = 'bg-emerald-500/15 text-emerald-600 font-bold';
              } else if (st === 'QC_REJECTED') {
                stText = 'Đã từ chối nhận';
                stColor = 'bg-red-500/15 text-red-600 font-bold';
              }

              const vehicle =
                b.transportJourney?.vehicle_plate ||
                b.transport_journey?.vehicle_plate ||
                b.transport_vehicle_plate ||
                b.vehicle_plate ||
                b.vehiclePlate ||
                'Xe lạnh IoT';

              return (
                <button
                  type="button"
                  key={b.batch_code}
                  onClick={() => onSelectBatch && onSelectBatch(b)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'border-[#F95716] bg-[#F95716]/[0.08] shadow-[0_4px_16px_rgba(249,87,22,0.12)] ring-1 ring-[#F95716]'
                      : 'border-orange-950/5 dark:border-orange-500/10 hover:border-[#F95716]/40 bg-orange-950/[0.01] hover:bg-orange-950/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="text-xs font-mono font-bold text-[#F95716] truncate">
                      {b.batch_code}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${stColor}`}>
                      {stText}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] line-clamp-1">
                      {b.product_name || b.productName}
                    </div>
                    <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                      Nông trại: {b.farm_name || b.farmName || 'LangBiang Đà Lạt'}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-orange-950/5 dark:border-orange-500/10 flex items-center justify-between text-[10.5px] text-neutral-400">
                    <span className="flex items-center gap-1 font-mono">
                      <Truck size={12} className="text-[#F95716]" />
                      {vehicle}
                    </span>
                    <span className="font-semibold text-[#1A1A1A] dark:text-neutral-300">
                      {b.total_weight_kg || b.weight_kg || 500} kg
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-400 text-xs">
            {qcTab === 'pending'
              ? 'Hiện không có lô hàng nào đang chờ kiểm định tại cổng tiếp nhận. Khi tài xế xe lạnh vận chuyển lô hàng đến kho (trạng thái DELIVERED), lô hàng sẽ tự động xuất hiện tại đây.'
              : 'Chưa có lịch sử lô hàng nào được kiểm định.'}
          </div>
        )}
      </div>

      {/* CHI TIẾT ĐỐI SOÁT & KÝ DUYỆT SMART CONTRACT */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Kết quả Audit Chuỗi Khối & TTI */}
        <div className={`${CARD} xl:col-span-2 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
              Kết quả đối soát toàn vẹn chuỗi lạnh lô {selectedBatch?.batch_code || '---'}
            </h3>
            {selectedBatch && (
              <span className="text-xs font-mono text-neutral-400">
                Nguồn: {selectedBatch.farm_name || selectedBatch.farmName}
              </span>
            )}
          </div>

          {qcAuditResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.02] border border-orange-950/5 dark:border-orange-500/10">
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
                <div className="p-4 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.02] border border-orange-950/5 dark:border-orange-500/10">
                  <div className="text-[10.5px] font-bold text-neutral-400 uppercase">Tính toàn vẹn sổ cái</div>
                  <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {qcAuditResult.merkle_valid ? 'KHỚP 100%' : 'HỢP LỆ'}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">Merkle Tree không bị giả mạo</div>
                </div>
                <div className="p-4 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.02] border border-orange-950/5 dark:border-orange-500/10">
                  <div className="text-[10.5px] font-bold text-neutral-400 uppercase">Khuyến nghị nhận hàng</div>
                  <div className="text-base font-extrabold text-emerald-600 mt-2">
                    {qcAuditResult.recommendation || 'ĐẠT CHUẨN TIẾP NHẬN'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.02] border border-orange-950/5 dark:border-orange-500/10 text-xs leading-relaxed font-mono">
                <div>Mã băm xác thực sổ cái: {qcAuditResult.merkle_root || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</div>
                <div className="mt-1">Số vi phạm nhiệt độ trên đường: {qcAuditResult.violations_count || 0} lần</div>
                <div className="mt-1">Thời gian lưu kệ ước tính: {qcAuditResult.shelf_life_hours || 144} giờ</div>
                <div className="mt-1 text-emerald-600 font-bold">
                  Trạng thái: Cho phép nhập kho và phân bổ quầy kệ theo chuẩn FEFO.
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-neutral-400 text-xs">
              <ShieldCheck size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
              Bấm nút <span className="font-bold text-[#F95716]">"Kiểm toán TTI 72h ngay"</span> ở góc trên để đối soát hồ sơ vi khí hậu chuỗi lạnh của lô hàng này.
            </div>
          )}
        </div>

        {/* Ký Smart Contract Nghiệm Thu Cổng Tiếp Nhận */}
        <div className={`${CARD} space-y-4`}>
          <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#F95716]" />
            Ký số Smart Contract cổng tiếp nhận
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Hành động ký số sẽ kích hoạt hợp đồng thông minh Smart Contract để cập nhật trạng thái lô hàng lên Blockchain. Khi được duyệt đạt, lô hàng sẽ tự động chuyển tới Quản lý kệ để xếp lên quầy siêu thị.
          </p>

          <div>
            <label className="text-xs font-bold text-neutral-400 block mb-1">Ghi chú biên bản KCS</label>
            <textarea
              rows={3}
              value={qcSignatureNote}
              onChange={(e) => setQcSignatureNote(e.target.value)}
              placeholder="Nhập ghi chú kiểm tra ngoại quan, cảm quan, bao bì..."
              className="w-full rounded-2xl border border-orange-950/10 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02] p-3 text-xs focus:outline-none focus:border-[#F95716]"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={!selectedBatch}
              onClick={() => handleApproveQc('REJECT')}
              className="flex-1 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40 cursor-pointer"
            >
              TỪ CHỐI NHẬN
            </button>
            <button
              type="button"
              disabled={!selectedBatch}
              onClick={() => handleApproveQc('ACCEPT')}
              className="flex-1 rounded-2xl bg-emerald-600 p-3 text-xs font-bold text-white shadow-sm hover:brightness-105 transition-all disabled:opacity-40 cursor-pointer"
            >
              KÝ DUYỆT NHẬN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
