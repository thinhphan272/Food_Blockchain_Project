import React from 'react';

/**
 * Stripe - Nền gạch chéo sọc cảm biến chuỗi lạnh
 */
function Stripe({ solid = false, className = '' }) {
  if (solid) {
    return <div className={`h-full w-full bg-[#F95716] ${className}`} />;
  }
  return (
    <div
      className={`h-full w-full ${className}`}
      style={{
        backgroundColor: '#F95716',
        backgroundImage:
          'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.6) 4px, rgba(255,255,255,0.6) 8px)',
      }}
    />
  );
}

export default function ColdChainGaugeCard({
  batchCount = 0,
  tempCompliancePct = 100,
  gasSafetyPct = 100,
  calculatedTti = 100.0,
  currentTemp = null,
  currentGas = null,
  ttiDisplay = '100.0%',
  isLive = false,
}) {
  // Đảm bảo khi xe chưa khởi hành (!isLive), các thanh cảm biến để chế độ chờ (0%) và chưa hiện số đo
  const resolvedTtiPct = isLive
    ? Math.max(0, Math.min(100, Math.round(parseFloat(ttiDisplay) || calculatedTti || 100)))
    : 0;

  const bars = [
    {
      pct: isLive ? Math.max(0, Math.min(100, Math.round(tempCompliancePct ?? 100))) : 0,
      hatch: false,
      label: 'Nhiệt độ',
      val: isLive && currentTemp != null ? `${Number(currentTemp).toFixed(1)}°C` : 'Chờ khởi hành',
    },
    {
      pct: isLive ? Math.max(0, Math.min(100, Math.round(gasSafetyPct ?? 100))) : 0,
      hatch: true,
      label: 'Khí gas',
      val: isLive && currentGas != null ? `${Number(currentGas).toFixed(1)} ppm` : 'Chờ khởi hành',
    },
    {
      pct: resolvedTtiPct,
      hatch: true,
      label: 'Độ tươi TTI',
      val: isLive ? ttiDisplay : 'Chờ khởi hành',
    },
  ];

  return (
    <section className="rounded-[28px] border border-orange-950/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F] flex flex-col justify-between">
      {/* Header */}
      <div>
        <h3 className="text-[15px] font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
          Chỉ số chuỗi lạnh
        </h3>
        <p className="mt-0.5 text-[11.5px] font-medium text-neutral-400">
          {isLive
            ? `${batchCount} lô hàng • Cảm biến trực tuyến`
            : 'Chờ chuyến xe khởi hành • Cảm biến chế độ chờ'}
        </p>
      </div>

      {/* 3 Vertical Hatching Bars - Kéo dài cân đối không gian thẻ */}
      <div className="mt-4 flex flex-1 items-end justify-around gap-5 px-2 pt-2 pb-1 min-h-[220px]">
        {bars.map((b) => (
          <div key={b.label} className="group relative flex w-14 flex-col items-center">
            {/* Tooltip Hover */}
            <span className="pointer-events-none absolute -top-1 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#1A1A1A] px-2.5 py-1 text-[10px] font-semibold text-white opacity-0 transition-all group-hover:-top-3 group-hover:opacity-100 dark:bg-[#2A1E16]">
              {b.label}: {b.val}
            </span>

            {/* Capsule Bar */}
            <div className="flex h-48 sm:h-52 w-full items-end overflow-hidden rounded-full bg-orange-950/[0.05] dark:bg-white/[0.06] shadow-inner">
              <div
                className="w-full transition-all duration-700 ease-out"
                style={{ height: `${b.pct}%` }}
              >
                <Stripe solid={!b.hatch} className="rounded-full" />
              </div>
            </div>

            {/* Percentage & Label */}
            <span className="mt-2.5 text-[12px] font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5]">
              {!isLive ? '—' : b.label === 'Độ tươi TTI' ? ttiDisplay : `${b.pct}%`}
            </span>
            <span className="text-[10.5px] font-medium text-neutral-400 text-center truncate w-full mt-0.5">
              {b.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

