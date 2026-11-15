import React, { useEffect } from 'react';
import { ShoppingCart, Layers, CheckCircle, Box } from '../components/MomentumIcons';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ShelfFefoPosPage({
  batches = [],
  selectedBatch,
  onSelectBatch,
  currentUser,
  scannerActive,
  setScannerActive,
  posSerialInput,
  setPosSerialInput,
  handlePosCheckout,
  posCheckoutResult,
  handleStockShelf,
  fefoQueues = [],
}) {
  const CARD =
    'rounded-[28px] border border-orange-950/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]';

  const isCashier = currentUser?.role === 'CASHIER';
  const isShelfStaff = currentUser?.role === 'SHELF_OPERATOR';

  // Tự động chọn lô đầu tiên nếu chưa chọn
  useEffect(() => {
    if (!selectedBatch && batches.length > 0 && onSelectBatch) {
      onSelectBatch(batches[0]);
    }
  }, [batches, selectedBatch, onSelectBatch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5]">
            {isCashier
              ? 'Quầy Thu Ngân Bán Lẻ POS & Hủy Tem QR Niêm Phong'
              : isShelfStaff
              ? 'Quản Lý Quầy Kệ Thông Minh & Hàng Đợi FEFO'
              : 'Quản Lý Quầy Kệ FEFO & Quầy Thu Ngân POS'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Nhân sự: {currentUser?.fullName || 'Nhân viên Siêu thị'} ({currentUser?.role || 'STORE_STAFF'}) &bull; Khóa phân tán Redlock 0.05s chống tái sử dụng bao bì và tối ưu hạn dùng FEFO
          </p>
        </div>
      </div>

      {/* THANH CHỌN LÔ HÀNG ĐỂ XẾP KỆ (HIỂN THỊ CHO SHELF STAFF & ADMIN) */}
      {!isCashier && (
        <div className={`${CARD} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-[#F95716]" />
              <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Chọn lô hàng cần xếp lên kệ ({batches.length} lô):
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[#F95716]">
              Đang chọn: {selectedBatch?.batch_code || 'Chưa chọn'}
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {batches.map((b) => {
              const isSelected = selectedBatch?.batch_code === b.batch_code;
              const st = String(b.status || 'CREATED').toUpperCase();
              let stText = 'Chờ kiểm';
              let stColor = 'bg-neutral-500/10 text-neutral-500';
              if (st === 'QC_ACCEPTED') { stText = 'Sẵn sàng lên kệ'; stColor = 'bg-emerald-500/15 text-emerald-600 font-bold'; }
              else if (st === 'ON_SHELF') { stText = 'Đang trên kệ'; stColor = 'bg-emerald-600 text-white font-bold'; }
              else if (st === 'DELIVERED') { stText = 'Chờ duyệt KCS'; stColor = 'bg-indigo-500/15 text-indigo-600'; }

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
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${stColor}`}>{stText}</span>
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

      <div className={`grid grid-cols-1 ${isCashier || isShelfStaff ? 'xl:grid-cols-1' : 'xl:grid-cols-2'} gap-6`}>
        {/* Quầy Thu Ngân POS (Ẩn với Shelf Staff nếu muốn xem riêng) */}
        {!isShelfStaff && (
          <div className={`${CARD} space-y-4`}>
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
              <ShoppingCart size={18} className="text-[#F95716]" />
              Quầy thu ngân POS bán hàng & hủy tem QR
            </h3>
            <p className="text-xs text-neutral-400">
              Mỗi sản phẩm chỉ được bán một lần duy nhất. Cơ chế khóa phân tán Redis Redlock sẽ ngăn chặn triệt để hành vi tái sử dụng tem giả mạo.
            </p>

            {/* Camera Scanner Toggle */}
            <div className="p-3 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.02] border border-orange-950/5 dark:border-orange-500/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Máy quét camera mã QR trực tiếp
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setScannerActive(!scannerActive);
                    if (!scannerActive) {
                      setTimeout(() => {
                        const scanner = new Html5QrcodeScanner('qr-reader-container', { fps: 10, qrbox: 200 });
                        scanner.render(
                          (decodedText) => {
                            setPosSerialInput(decodedText);
                            handlePosCheckout(decodedText);
                            scanner.clear();
                            setScannerActive(false);
                          },
                          () => {}
                        );
                      }, 200);
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-[#F95716] text-white text-xs font-bold shadow-sm hover:brightness-105 cursor-pointer"
                >
                  {scannerActive ? 'Đóng Camera' : 'Bật Camera Quét'}
                </button>
              </div>
              {scannerActive && <div id="qr-reader-container" className="rounded-xl overflow-hidden" />}
            </div>

            {/* Input Thủ Công */}
            <div className="flex gap-2">
              <input
                type="text"
                value={posSerialInput}
                onChange={(e) => setPosSerialInput(e.target.value)}
                placeholder="Nhập mã tem đơn vị, ví dụ: QR-ITEM-VEG-2026-001-001"
                className="flex-1 rounded-2xl border border-orange-950/10 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02] p-3 text-xs font-mono focus:outline-none focus:border-[#F95716]"
              />
              <button
                type="button"
                onClick={() => handlePosCheckout(posSerialInput)}
                className="px-6 rounded-2xl bg-[#F95716] text-white text-xs font-bold shadow-sm hover:brightness-105 cursor-pointer"
              >
                Thanh Toán
              </button>
            </div>

            {/* POS Result Notification */}
            {posCheckoutResult && (
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                  posCheckoutResult.status === 200
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : posCheckoutResult.status === 409
                    ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                }`}
              >
                <div className="font-bold text-sm mb-1">
                  {posCheckoutResult.status === 200
                    ? 'XÁC NHẬN THANH TOÁN THÀNH CÔNG (200 OK)'
                    : posCheckoutResult.status === 409
                    ? 'PHÁT HIỆN GIAN LẬN: TEM ĐÃ BÁN (409 CONFLICT)'
                    : 'LỖI HỆ THỐNG'}
                </div>
                <div>{posCheckoutResult.data?.message || JSON.stringify(posCheckoutResult.data)}</div>
                {posCheckoutResult.status === 409 && (
                  <div className="mt-1 font-semibold">
                    Khóa phân tán Redlock đã chặn đứng việc tái sử dụng tem trên quầy thanh toán!
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hàng đợi kệ kép FEFO (Ẩn với Thu ngân) */}
        {!isCashier && (
          <div className={`${CARD} space-y-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
                <Layers size={18} className="text-[#F95716]" />
                Hàng đợi kệ kép FEFO
              </h3>
              <button
                type="button"
                disabled={!selectedBatch}
                onClick={handleStockShelf}
                className="px-4 py-2 rounded-2xl border border-[#F95716]/30 bg-[#F95716]/10 text-[#F95716] text-xs font-bold hover:bg-[#F95716] hover:text-white transition-all disabled:opacity-40 cursor-pointer"
              >
                + Xếp lô {selectedBatch?.batch_code || '---'} vào kệ
              </button>
            </div>

            <div className="space-y-2">
              {fefoQueues.length > 0 ? (
                fefoQueues.map((item, idx) => (
                  <div
                    key={item.item_code || idx}
                    className="flex items-center justify-between p-3 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]"
                  >
                    <div>
                      <div className="text-xs font-bold font-mono text-[#1A1A1A] dark:text-[#F5F5F5]">
                        #{idx + 1} &bull; {item.item_code || item.serialCode}
                      </div>
                      <div className="text-[10px] text-neutral-400">Kệ: {item.shelf_name || 'Kệ Mát A1'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-[#F95716]">
                        Điểm FEFO: {Number(item.fefo_priority_score || item.score || 0).toFixed(0)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">Ưu tiên bán trước</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-neutral-400">
                  Chưa có sản phẩm trong hàng đợi FEFO. Chọn một lô hàng rồi bấm nút "+ Xếp lô vào kệ" để đưa vào hàng đợi.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

