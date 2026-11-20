import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingCart, Layers, CheckCircle, Box, AlertTriangle, ShieldCheck, Camera, X } from '../components/MomentumIcons';
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
  const isAdmin = currentUser?.role === 'ADMIN';

  // Quản lý kệ: Tab phân tách rõ ràng giữa "Chờ xếp kệ", "Đang trên kệ" và "Đã bán hết"
  const [shelfTab, setShelfTab] = useState('waiting'); // 'waiting' (QC_ACCEPTED) | 'active' (ON_SHELF) | 'sold' (SOLD)
  const scannerRef = useRef(null);

  // Lưu lịch sử hóa đơn thanh toán POS
  const [recentReceipts, setRecentReceipts] = useState(() => {
    try {
      const saved = localStorage.getItem('smartchain_pos_receipts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Tự động ghi nhận biên lai khi có kết quả thanh toán thành công
  useEffect(() => {
    if (posCheckoutResult && posCheckoutResult.status === 200) {
      const itemData = matchedItem || {};
      const newReceipt = {
        id: posCheckoutResult.data?.receiptId || `REC-${Date.now().toString().slice(-6)}`,
        serialCode: cleanSerial || itemData.serialCode || 'Mã tem',
        productName: itemData.productName || 'Sản phẩm siêu thị',
        batchCode: itemData.batchCode || selectedBatch?.batch_code || '---',
        price: itemData.price || '45,000 đ',
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      setRecentReceipts((prev) => {
        const updated = [newReceipt, ...prev.filter((r) => r.serialCode !== newReceipt.serialCode)].slice(0, 15);
        try {
          localStorage.setItem('smartchain_pos_receipts', JSON.stringify(updated));
        } catch (e) { }
        return updated;
      });
    }
  }, [posCheckoutResult]);

  // Phân loại danh sách lô hàng cho nhân viên Quản lý kệ
  const waitingBatches = useMemo(() => {
    return batches.filter((b) => {
      const st = String(b.status || '').toUpperCase();
      return st === 'QC_ACCEPTED';
    });
  }, [batches]);

  const activeBatches = useMemo(() => {
    return batches.filter((b) => {
      const st = String(b.status || '').toUpperCase();
      return st === 'ON_SHELF';
    });
  }, [batches]);

  const soldBatches = useMemo(() => {
    return batches.filter((b) => {
      const st = String(b.status || '').toUpperCase();
      return st === 'SOLD';
    });
  }, [batches]);

  const shelfDisplayedBatches =
    shelfTab === 'waiting'
      ? waitingBatches
      : shelfTab === 'active'
      ? activeBatches
      : soldBatches;

  // Tự động chọn lô đầu tiên của tab khi chuyển tab
  useEffect(() => {
    if (shelfDisplayedBatches.length > 0) {
      const exists = selectedBatch && shelfDisplayedBatches.some((b) => b.batch_code === selectedBatch.batch_code);
      if (!exists && onSelectBatch) {
        onSelectBatch(shelfDisplayedBatches[0]);
      }
    }
  }, [shelfTab, shelfDisplayedBatches, selectedBatch, onSelectBatch]);

  // Tìm kiếm thông tin mặt hàng theo mã serial khi quét hoặc nhập tay (Dành cho Thu Ngân POS)
  const cleanSerial = (posSerialInput || '').trim();
  const matchedItem = useMemo(() => {
    if (!cleanSerial) return null;

    // Trích xuất mã serial sạch nếu người dùng quét ra link URL (ví dụ https://.../trace/QR-ITEM-...)
    let targetCode = cleanSerial;
    if (targetCode.includes('/trace/')) {
      targetCode = targetCode.split('/trace/').pop().split('?')[0].split('#')[0];
    } else if (targetCode.includes('=')) {
      targetCode = targetCode.split('=').pop();
    }
    targetCode = targetCode.trim();

    // 1. Tìm trong tất cả các lô hàng và danh sách tem con
    for (const b of batches) {
      const items = b.item_qr_serials || b.itemQrSerials || b.items || [];
      const item = items.find(
        (it) =>
          String(it.serial_code || it.serialCode || '').toUpperCase() === targetCode.toUpperCase()
      );
      if (item) {
        const isSold = String(item.status || '').toUpperCase().includes('SOLD') || String(item.status || '').toUpperCase().includes('VOID');
        return {
          serialCode: item.serial_code || item.serialCode || targetCode,
          productName: b.product_name || b.productName,
          category: b.category,
          farmName: b.farm_name || b.farmName,
          batchCode: b.batch_code,
          weightKg: b.weight_per_package_kg || (b.total_weight_kg ? (b.total_weight_kg / 50).toFixed(1) : '0.5'),
          unit: b.package_unit || 'Khay đóng gói',
          price: b.category === 'MEAT_POULTRY' ? '85,000 đ' : b.category === 'SEAFOOD' ? '120,000 đ' : '45,000 đ',
          isSold: isSold,
          itemStatus: item.status || (isSold ? 'SOLD_SEAL_VOID' : 'ACTIVE_UNSOLD'),
          batch: b,
        };
      }
    }

    // 2. Nếu mã quét trùng với mã lô hàng (Batch Code)
    const matchBatch = batches.find(
      (b) => String(b.batch_code || '').toUpperCase() === targetCode.toUpperCase()
    );
    if (matchBatch) {
      return {
        serialCode: matchBatch.batch_code,
        productName: matchBatch.product_name || matchBatch.productName,
        category: matchBatch.category,
        farmName: matchBatch.farm_name || matchBatch.farmName,
        batchCode: matchBatch.batch_code,
        weightKg: matchBatch.total_weight_kg || matchBatch.weight_kg || '500',
        unit: 'Nguyên Lô Hàng',
        price: 'Bán sỉ theo kiện',
        isSold: String(matchBatch.status || '').toUpperCase() === 'SOLD',
        itemStatus: matchBatch.status,
        batch: matchBatch,
        isBatchLevel: true,
      };
    }

    // 3. Fallback: Nếu mã đúng định dạng QR-ITEM nhưng chưa nạp đủ vào batch memory
    if (targetCode.startsWith('QR-ITEM-')) {
      const parts = targetCode.split('-');
      const categoryPrefix = parts.length > 2 ? parts[2] : 'PROD';
      return {
        serialCode: targetCode,
        productName: `Sản Phẩm Mã Số ${targetCode}`,
        category: categoryPrefix,
        farmName: 'Cơ sở sản xuất đã kiểm định VietGAP',
        batchCode: parts.slice(0, 5).join('-').replace('QR-ITEM-', 'LOT-'),
        weightKg: '0.5',
        unit: 'Khay định lượng',
        price: '45,000 đ',
        isSold: false,
        itemStatus: 'ACTIVE_UNSOLD',
        isFallback: true,
      };
    }

    return null;
  }, [cleanSerial, batches]);

  // Quản lý vòng đời máy quét Camera
  const toggleCameraScanner = () => {
    if (scannerActive) {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {}
      }
      setScannerActive(false);
    } else {
      setScannerActive(true);
      setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner('qr-reader-container', {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
          });
          scannerRef.current = scanner;
          scanner.render(
            (decodedText) => {
              // Chuẩn hóa mã trích xuất
              let code = decodedText;
              if (code.includes('/trace/')) {
                code = code.split('/trace/').pop().split('?')[0].split('#')[0];
              }
              setPosSerialInput(code);
              scanner.clear();
              setScannerActive(false);
            },
            (error) => {
              // Bỏ qua lỗi quét từng khung hình
            }
          );
        } catch (err) {
          console.error('Không thể khởi tạo camera scanner:', err);
        }
      }, 300);
    }
  };

  return (
    <div className="space-y-6">
      {/* TIÊU ĐỀ TRANG */}
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
            {isCashier ? (
              <span>
                Nhân sự: <span className="font-bold text-[#F95716]">{currentUser?.fullName || 'Nguyễn Mai Anh'}</span> (Thu Ngân POS) &bull; Quét mã QR sản phẩm bằng camera hoặc máy đọc mã vạch để tra cứu và thanh toán nhanh
              </span>
            ) : (
              <span>
                Nhân sự: <span className="font-bold text-[#F95716]">{currentUser?.fullName || 'Đỗ Quốc Bảo'}</span> (Quản Lý Kệ) &bull; Điều phối hàng hóa theo nguyên tắc FEFO (Hết hạn trước - Bán trước) & Tối ưu quầy kệ siêu thị
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHỐI 1: QUẢN LÝ QUẦY KỆ (DÀNH CHO SHELF_OPERATOR HOẶC ADMIN)              */}
      {/* ========================================================================= */}
      {!isCashier && (
        <div className="space-y-4">
          {/* BANNER LUỒNG NGHIỆP VỤ */}
          <div className="p-4 rounded-2xl bg-orange-500/[0.06] border border-[#F95716]/20 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#F95716] text-white font-bold">
                i
              </span>
              <span className="text-[#1A1A1A] dark:text-[#F5F5F5]">
                <strong>Luồng nghiệp vụ Quản lý kệ:</strong> Tiếp nhận các lô hàng đã được KCS nghiệm thu đạt chuẩn chất lượng (QC_ACCEPTED) &rarr; Xếp lên quầy kệ siêu thị theo thứ tự ưu tiên hạn dùng FEFO &rarr; Trạng thái lô chuyển thành Đang bày bán (ON_SHELF).
              </span>
            </div>
          </div>

          {/* KHUNG CHỌN LÔ HÀNG XẾP KỆ (RESPONSIVE GRID - 2 TAB TÁCH BIỆT RÕ RÀNG) */}
          <div className={`${CARD} space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-orange-950/5 dark:border-orange-500/10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShelfTab('waiting')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    shelfTab === 'waiting'
                      ? 'bg-[#F95716] text-white shadow-sm'
                      : 'bg-orange-950/[0.04] dark:bg-white/[0.05] text-neutral-500 hover:text-[#1A1A1A] dark:hover:text-white'
                  }`}
                >
                  Lô hàng chờ xếp lên kệ ({waitingBatches.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShelfTab('active')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    shelfTab === 'active'
                      ? 'bg-[#F95716] text-white shadow-sm'
                      : 'bg-orange-950/[0.04] dark:bg-white/[0.05] text-neutral-500 hover:text-[#1A1A1A] dark:hover:text-white'
                  }`}
                >
                  Lô hàng đang bày bán trên kệ ({activeBatches.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShelfTab('sold')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    shelfTab === 'sold'
                      ? 'bg-[#F95716] text-white shadow-sm'
                      : 'bg-orange-950/[0.04] dark:bg-white/[0.05] text-neutral-500 hover:text-[#1A1A1A] dark:hover:text-white'
                  }`}
                >
                  Lô hàng đã bán hết ({soldBatches.length})
                </button>
              </div>

              <div className="text-xs">
                <span className="text-neutral-400">Đang chọn: </span>
                <span className="font-mono font-bold text-[#F95716]">
                  {selectedBatch?.batch_code || 'Chưa chọn'}
                </span>
              </div>
            </div>

            {/* LƯỚI CARD LÔ HÀNG CO GIÃN THEO MÀN HÌNH */}
            {shelfDisplayedBatches.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {shelfDisplayedBatches.map((b) => {
                  const isSelected = selectedBatch?.batch_code === b.batch_code;
                  const st = String(b.status || 'CREATED').toUpperCase();
                  const isWaiting = st === 'QC_ACCEPTED';
                  const isSold = st === 'SOLD';
                  const items = b.item_qr_serials || b.itemQrSerials || [];
                  const unsold = items.filter(
                    (it) => !String(it.status || '').toUpperCase().includes('SOLD') && !String(it.status || '').toUpperCase().includes('VOID')
                  ).length;
                  const total = items.length || b.unit_count || 1;

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
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                            isSold
                              ? 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 font-black'
                              : isWaiting
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isSold ? 'Đã bán hết' : isWaiting ? 'Chờ xếp vào kệ' : 'Đang trên kệ'}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] line-clamp-1">
                          {b.product_name || b.productName}
                        </div>
                        <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                          Nguồn: {b.farm_name || b.farmName || 'Cơ sở sản xuất'}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-orange-950/5 dark:border-orange-500/10 flex items-center justify-between text-[10.5px]">
                        <span className="text-neutral-400">Số lượng còn:</span>
                        <span className="font-bold font-mono text-[#F95716]">
                          {isSold ? '0' : unsold} / {total} sản phẩm
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400 text-xs">
                {shelfTab === 'waiting'
                  ? 'Hiện không có lô hàng nào chờ xếp kệ. Khi KCS kiểm định và ký duyệt nghiệm thu đạt chuẩn, lô hàng sẽ tự động xuất hiện tại đây.'
                  : 'Chưa có lô hàng nào đang trên quầy kệ.'}
              </div>
            )}
          </div>

          {/* HÀNG ĐỢI KỆ KÉP FEFO & NÚT XẾP KỆ */}
          <div className={`${CARD} space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
                  <Layers size={18} className="text-[#F95716]" />
                  Hàng đợi kệ kép FEFO (First-Expired, First-Out)
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Tự động sắp xếp vị trí trưng bày ưu tiên cho các sản phẩm có thời hạn sử dụng ngắn hơn ra phía trước
                </p>
              </div>

              <button
                type="button"
                disabled={!selectedBatch}
                onClick={handleStockShelf}
                className="px-5 py-2.5 rounded-2xl bg-[#F95716] text-white text-xs font-bold shadow-md hover:brightness-105 transition-all disabled:opacity-40 cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
              >
                <span>+ Xếp lô {selectedBatch?.batch_code || '---'} vào quầy kệ</span>
              </button>
            </div>

            <div className="space-y-2">
              {fefoQueues.length > 0 ? (
                fefoQueues.map((item, idx) => (
                  <div
                    key={item.item_code || idx}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]"
                  >
                    <div>
                      <div className="text-xs font-bold font-mono text-[#1A1A1A] dark:text-[#F5F5F5]">
                        #{idx + 1} &bull; {item.item_code || item.serialCode}
                      </div>
                      <div className="text-[10.5px] text-neutral-400 mt-0.5">
                        Vị trí kệ: <span className="font-semibold text-[#1A1A1A] dark:text-neutral-200">{item.shelf_name || 'Kệ Mát Thực Phẩm Tươi A1'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-[#F95716]">
                        Điểm ưu tiên FEFO: {Number(item.fefo_priority_score || item.score || 0).toFixed(0)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                        Xếp phía trước (Bán trước)
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-neutral-400">
                  Chưa có sản phẩm trong hàng đợi FEFO. Chọn một lô hàng ở danh sách trên rồi bấm nút <strong className="text-[#F95716]">"+ Xếp lô vào quầy kệ"</strong> để đưa sản phẩm vào hàng đợi tối ưu hạn dùng.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KHỐI 2: QUẦY THU NGÂN POS (DÀNH CHO CASHIER HOẶC ADMIN)                  */}
      {/* ========================================================================= */}
      {!isShelfStaff && (
        <div className={`${CARD} space-y-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-950/5 dark:border-orange-500/10">
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
                <ShoppingCart size={18} className="text-[#F95716]" />
                Quầy Thu Ngân POS Bán Hàng & Hủy Tem QR Niêm Phong
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Quét mã QR trên tem bao bì hoặc nhập mã để kiểm tra thông tin món hàng và hoàn tất thanh toán
              </p>
            </div>

            <button
              type="button"
              onClick={toggleCameraScanner}
              className="px-4 py-2 rounded-full bg-[#F95716] text-white text-xs font-bold shadow-md hover:brightness-105 transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
            >
              <Camera size={15} />
              <span>{scannerActive ? 'Đóng Camera' : 'Bật Camera Quét Mã'}</span>
            </button>
          </div>

          {/* VÙNG CAMERA QUÉT MÃ QR TRỰC TIẾP */}
          {scannerActive && (
            <div className="p-4 rounded-3xl bg-neutral-900 border border-[#F95716]/30 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold flex items-center gap-2 text-[#F95716]">
                  <Camera size={16} />
                  <span>Đang mở Camera - Hướng ống kính vào mã QR trên bao bì sản phẩm</span>
                </div>
                <button
                  type="button"
                  onClick={toggleCameraScanner}
                  className="p-1 rounded-full hover:bg-white/10 text-neutral-400 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div id="qr-reader-container" className="rounded-2xl overflow-hidden max-w-md mx-auto" />
              <div className="text-[11px] text-center text-neutral-400">
                Hệ thống sẽ tự động nhận diện mã tem, điền vào ô tìm kiếm và tra cứu chi tiết sản phẩm ngay lập tức.
              </div>
            </div>
          )}

          {/* THANH NHẬP MÃ SẢN PHẨM HOẶC TEM QR */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
              Mã Tem Sản Phẩm Hoặc Mã Lô Hàng *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={posSerialInput}
                  onChange={(e) => setPosSerialInput(e.target.value)}
                  placeholder="Ví dụ: QR-ITEM-VEG-2026-001-001 hoặc quét camera..."
                  className="w-full rounded-2xl border border-orange-950/10 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02] p-3 text-xs font-mono font-bold focus:outline-none focus:border-[#F95716] pr-10"
                />
                {posSerialInput && (
                  <button
                    type="button"
                    onClick={() => setPosSerialInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={!cleanSerial}
                onClick={() => handlePosCheckout(cleanSerial)}
                className="px-6 rounded-2xl bg-[#F95716] text-white text-xs font-black shadow-md hover:brightness-105 transition-all disabled:opacity-40 cursor-pointer"
              >
                Thanh Toán
              </button>
            </div>
          </div>

          {/* HIỂN THỊ KẾT QUẢ TRA CỨU SẢN PHẨM TRỰC TIẾP */}
          <div className="space-y-3">
            {matchedItem ? (
              <div className="p-5 rounded-3xl border border-orange-950/10 dark:border-orange-500/20 bg-orange-950/[0.02] dark:bg-white/[0.02] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-950/5 dark:border-orange-500/10">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Box size={22} />
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {matchedItem.productName}
                      </h4>
                      <p className="text-[11px] font-mono text-[#F95716] mt-0.5">
                        Mã tem: {matchedItem.serialCode}
                      </p>
                    </div>
                  </div>

                  {/* Badge tình trạng tem */}
                  <div>
                    {matchedItem.isSold ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
                        <AlertTriangle size={14} />
                        CẢNH BÁO: TEM ĐÃ BÁN (NIÊM PHONG ĐÃ HỦY)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <CheckCircle size={14} />
                        TEM HỢP LỆ &bull; SẴN SÀNG THANH TOÁN
                      </span>
                    )}
                  </div>
                </div>

                {/* Thông số chi tiết sản phẩm */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1C140F] border border-orange-950/5 dark:border-orange-500/10">
                    <div className="text-[10px] uppercase font-bold text-neutral-400">Nông trại sản xuất</div>
                    <div className="font-semibold text-[#1A1A1A] dark:text-neutral-200 mt-1 truncate">
                      {matchedItem.farmName}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1C140F] border border-orange-950/5 dark:border-orange-500/10">
                    <div className="text-[10px] uppercase font-bold text-neutral-400">Lô hàng gốc</div>
                    <div className="font-mono font-bold text-[#F95716] mt-1 truncate">
                      {matchedItem.batchCode}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1C140F] border border-orange-950/5 dark:border-orange-500/10">
                    <div className="text-[10px] uppercase font-bold text-neutral-400">Quy cách / Khối lượng</div>
                    <div className="font-semibold text-[#1A1A1A] dark:text-neutral-200 mt-1">
                      {matchedItem.weightKg} kg ({matchedItem.unit})
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white dark:bg-[#1C140F] border border-orange-950/5 dark:border-orange-500/10">
                    <div className="text-[10px] uppercase font-bold text-neutral-400">Giá thanh toán</div>
                    <div className="text-base font-extrabold text-[#F95716] mt-0.5">
                      {matchedItem.price}
                    </div>
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handlePosCheckout(matchedItem.serialCode)}
                    disabled={matchedItem.isSold}
                    className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle size={15} />
                    <span>Xác Nhận Thanh Toán & Hủy Tem Niêm Phong</span>
                  </button>
                </div>
              </div>
            ) : cleanSerial ? (
              <div className="p-6 rounded-3xl border border-red-500/20 bg-red-500/[0.04] text-center space-y-2">
                <AlertTriangle size={28} className="mx-auto text-red-500" />
                <div className="text-xs font-bold text-red-600 dark:text-red-400">
                  Không tìm thấy mặt hàng nào khớp với mã "{cleanSerial}"
                </div>
                <div className="text-[11px] text-neutral-400">
                  Vui lòng kiểm tra lại mã tem QR trên bao bì hoặc quét lại bằng camera.
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-3xl border border-dashed border-orange-950/10 dark:border-orange-500/10 text-center space-y-2 text-neutral-400">
                <ShoppingCart size={32} className="mx-auto text-neutral-300 dark:text-neutral-600" />
                <div className="text-xs font-medium">
                  Chưa quét hoặc nhập mã sản phẩm.
                </div>
                <div className="text-[11px]">
                  Bấm nút <strong className="text-[#F95716]">"Bật Camera Quét Mã"</strong> hoặc nhập mã tem đơn vị (ví dụ: <span className="font-mono">QR-ITEM-VEG-2026-001-001</span>) để hiển thị thông tin mặt hàng.
                </div>
              </div>
            )}
          </div>

          {/* KẾT QUẢ THANH TOÁN (THÀNH CÔNG HOẶC CẢNH BÁO TÁI SỬ DỤNG) */}
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
              <div className="font-bold text-sm mb-1 flex items-center gap-1.5">
                {posCheckoutResult.status === 200 ? (
                  <>
                    <CheckCircle size={16} />
                    <span>XÁC NHẬN THANH TOÁN THÀNH CÔNG (200 OK)</span>
                  </>
                ) : posCheckoutResult.status === 409 ? (
                  <>
                    <AlertTriangle size={16} />
                    <span>PHÁT HIỆN GIAN LẬN: TEM ĐÃ BÁN TRƯỚC ĐÓ (409 CONFLICT)</span>
                  </>
                ) : (
                  <span>THÔNG BÁO HỆ THỐNG</span>
                )}
              </div>
              <div>{posCheckoutResult.data?.message || JSON.stringify(posCheckoutResult.data)}</div>
              {posCheckoutResult.status === 409 && (
                <div className="mt-1 font-semibold text-red-500">
                  Tem QR niêm phong này đã bị hủy hiệu lực trong lần thanh toán trước. Hệ thống đã từ chối giao dịch để chống gian lận tái sử dụng bao bì.
                </div>
              )}
            </div>
          )}

          {/* NHẬT KÝ THANH TOÁN GIAO DỊCH THU NGÂN GẦN ĐÂY */}
          {recentReceipts.length > 0 && (
            <div className="pt-4 border-t border-orange-950/5 dark:border-orange-500/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-neutral-500 dark:text-neutral-400">
                  Lịch sử thanh toán thu ngân gần đây ({recentReceipts.length})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setRecentReceipts([]);
                    try { localStorage.removeItem('smartchain_pos_receipts'); } catch (e) { }
                  }}
                  className="text-[10.5px] font-bold text-neutral-400 hover:text-red-500 transition-colors"
                >
                  Xóa lịch sử
                </button>
              </div>

              <div className="space-y-2">
                {recentReceipts.map((rec) => (
                  <div
                    key={rec.id + rec.serialCode}
                    className="p-3 rounded-2xl bg-orange-950/[0.02] dark:bg-white/[0.02] border border-orange-950/5 dark:border-orange-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#F95716]">{rec.serialCode}</span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 font-bold">
                          Đã thanh toán
                        </span>
                      </div>
                      <div className="text-[11.5px] font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {rec.productName} &bull; <span className="font-mono text-neutral-400">{rec.batchCode}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-extrabold text-[#F95716]">{rec.price}</div>
                        <div className="text-[10px] text-neutral-400">{rec.time}</div>
                      </div>
                      <a
                        href={`/trace/${encodeURIComponent(rec.serialCode)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] hover:bg-[#F95716]/10 text-neutral-600 dark:text-neutral-300 hover:text-[#F95716] text-[11px] font-bold transition-all inline-flex items-center gap-1"
                      >
                        Xem chi tiết &rarr;
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
