import React from 'react';

/**
 * Bộ sinh Ma trận Mã QR SVG chuẩn cấu trúc Finder Pattern 7x7 + Timing Pattern
 * giúp hiển thị trực quan cả Mã QR Lô hàng (Master Batch QR) và Mã QR Đơn vị (Item Unit QR).
 */
export default function QrMatrixSvg({ value = 'QR-BATCH-LOT-VEG-2026-001', size = 136, accentColor = '#0f172a' }) {
  const gridSize = 21; // Version 1 QR Code (21x21 modules)

  // Băm chuỗi đầu vào thành dãy bit ổn định
  const hashBits = React.useMemo(() => {
    const str = String(value || 'SMARTCHAIN');
    const bits = [];
    let h1 = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h1 ^= str.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193);
    }
    for (let r = 0; r < gridSize; r++) {
      const row = [];
      for (let c = 0; c < gridSize; c++) {
        // 3 góc Finder Pattern 7x7
        const isTopLeft = r < 7 && c < 7;
        const isTopRight = r < 7 && c >= gridSize - 7;
        const isBottomLeft = r >= gridSize - 7 && c < 7;

        if (isTopLeft || isTopRight || isBottomLeft) {
          const lr = isTopLeft ? r : isTopRight ? r : r - (gridSize - 7);
          const lc = isTopLeft ? c : isTopRight ? c - (gridSize - 7) : c;
          const border = lr === 0 || lr === 6 || lc === 0 || lc === 6;
          const inner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
          row.push(border || inner);
        } else if (r === 6 || c === 6) {
          // Timing pattern
          row.push((r + c) % 2 === 0);
        } else if ((r === 7 && c < 8) || (c === 7 && r < 8) || (r === 7 && c >= gridSize - 8) || (c === gridSize - 8 && r < 8) || (r === gridSize - 8 && c < 8) || (c === 7 && r >= gridSize - 8)) {
          // Quiet separator
          row.push(false);
        } else {
          const idx = r * gridSize + c;
          const charCode = str.charCodeAt(idx % str.length);
          const bit = ((h1 >>> (idx % 24)) ^ (charCode * (r + 3) * (c + 7))) & 1;
          row.push(Boolean(bit));
        }
      }
      bits.push(row);
    }
    return bits;
  }, [value]);

  return (
    <div className="inline-flex flex-col items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${gridSize} ${gridSize}`}
        shapeRendering="crispEdges"
        aria-label={`QR Code for ${value}`}
      >
        <rect width={gridSize} height={gridSize} fill="#ffffff" />
        {hashBits.map((row, rIdx) =>
          row.map((cell, cIdx) =>
            cell ? (
              <rect
                key={`${rIdx}-${cIdx}`}
                x={cIdx}
                y={rIdx}
                width={1}
                height={1}
                fill={accentColor}
              />
            ) : null
          )
        )}
      </svg>
      <span className="mt-1.5 font-mono text-[10px] font-semibold text-slate-600 tracking-tight truncate max-w-[140px]">
        {value}
      </span>
    </div>
  );
}

