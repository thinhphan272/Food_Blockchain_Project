import React from 'react';
import { ArrowUpRight, Repeat } from '../MomentumIcons';

export default function FrostedHeroCard({
  selectedBatch,
  selectedProfile,
  setActiveTab,
  handleOtaSync,
}) {
  return (
    <section
      className="relative overflow-hidden rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      style={{
        background:
          'radial-gradient(120% 140% at 15% 0%, #FFB27A 0%, #FF8A4C 28%, #F95716 62%, #E0430B 100%)',
      }}
    >
      {/* Silk waves SVG background */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 640 420"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M-40 300 C 120 180, 260 380, 420 260 S 640 160, 700 240 L 700 460 L -40 460 Z" fill="rgba(255,255,255,0.14)" />
        <path d="M-40 340 C 140 240, 300 420, 460 300 S 660 220, 700 300 L 700 460 L -40 460 Z" fill="rgba(255,255,255,0.10)" />
        <circle cx="540" cy="80" r="90" fill="rgba(255,255,255,0.10)" />
        <circle cx="80" cy="70" r="60" fill="rgba(255,255,255,0.08)" />
      </svg>

      {/* Floating frosted glass widget */}
      <div className="relative flex h-full min-h-[240px] flex-col justify-center p-6 sm:p-7">
        <div className="rounded-2xl border border-white/30 bg-white/20 p-5 shadow-[0_8px_32px_rgba(120,40,0,0.18)] backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
            Chứng nhận an toàn thực phẩm
          </p>
          <h3 className="mt-1.5 text-[18px] font-extrabold leading-snug tracking-tight text-white sm:text-[20px]">
            {selectedBatch?.product_name || 'Xà Lách Thủy Canh Mỡ Đà Lạt'}
          </h3>
          <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-white/90">
            Dải nhiệt: {selectedProfile?.minTemp ?? 8}°C &ndash; {selectedProfile?.maxTemp ?? 12}°C &bull; Khí {selectedProfile?.gasType ?? 'C2H4'} an toàn
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('batches')}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12px] font-bold text-[#E0430B] shadow-[0_8px_20px_rgba(120,40,0,0.20)] hover:scale-105 transition-all"
            >
              Xem tem QR kép
              <ArrowUpRight size={13} />
            </button>
            <button
              type="button"
              onClick={handleOtaSync}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white px-3.5 py-2 text-[12px] font-bold backdrop-blur-md transition-all"
            >
              <Repeat size={13} /> Nạp OTA xe lạnh
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

