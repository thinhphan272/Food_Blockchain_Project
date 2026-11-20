import React from 'react';
import {
  Thermometer,
  Activity,
  Target,
  Box,
  ArrowUpRight,
} from '../MomentumIcons';

export default function MetricCardsGrid({
  currentTemp = null,
  tempStatusText = 'An toàn',
  minAllowedTemp = 8.0,
  maxAllowedTemp = 12.0,
  currentGas = null,
  gasStatusText = 'Ổn định',
  maxAllowedGas = 30.0,
  ttiDisplay = '100.0%',
  ttiDelta = 'Tối ưu',
  calculatedTti = 100.0,
  latestTelemetry = null,
  selectedBatch = null,
  isLive = false,
  isHistorical = false,
  tempSpikeCount = 0,
}) {
  const hasTemp = isLive && currentTemp !== null && currentTemp !== undefined && !Number.isNaN(Number(currentTemp));
  const hasGas = isLive && currentGas !== null && currentGas !== undefined && !Number.isNaN(Number(currentGas));
  const tempNum = hasTemp ? Number(currentTemp) : 0;
  const gasNum = hasGas ? Number(currentGas) : 0;

  const batchWeight =
    selectedBatch?.total_weight_kg && Number(selectedBatch.total_weight_kg) >= 50
      ? Number(selectedBatch.total_weight_kg)
      : selectedBatch?.weight_kg && Number(selectedBatch.weight_kg) >= 50
      ? Number(selectedBatch.weight_kg)
      : selectedBatch?.unit_weight_kg
      ? Number(selectedBatch.unit_weight_kg) * (Number(selectedBatch.unit_count) || 1)
      : 500.0;

  const displayWeight =
    isLive && latestTelemetry?.weight_kg && Number(latestTelemetry.weight_kg) > 50
      ? Number(latestTelemetry.weight_kg)
      : (Number(batchWeight) || 500.0);

  const safeDisplayWeight = Number(displayWeight) || 500.0;

  const metrics = [
    {
      label: isHistorical ? 'Nhiệt độ (TB Hành trình)' : 'Nhiệt độ',
      value: hasTemp ? `${tempNum.toFixed(1)}°C` : '—',
      delta: hasTemp ? tempStatusText : 'Chờ chuyến xe khởi hành',
      up: !hasTemp || (tempNum >= minAllowedTemp && tempNum <= maxAllowedTemp),
      icon: Thermometer,
      tint: '#F95716',
    },
    {
      label: isHistorical ? 'Khí sinh học (TB)' : 'Khí sinh học',
      value: hasGas ? `${gasNum.toFixed(1)} ppm` : '—',
      delta: hasGas ? gasStatusText : 'Chờ chuyến xe khởi hành',
      up: !hasGas || (maxAllowedGas <= 0 || gasNum <= maxAllowedGas),
      icon: Activity,
      tint: '#F59E0B',
    },
    {
      label: 'Độ tươi TTI',
      value: isLive ? ttiDisplay : '—',
      delta: isLive ? ttiDelta : 'Chờ chuyến xe khởi hành',
      up: true,
      icon: Target,
      tint: !isLive || calculatedTti >= 85 ? '#10B981' : calculatedTti >= 70 ? '#F59E0B' : '#EF4444',
    },
    {
      label: 'Khối lượng hàng hóa',
      value: `${safeDisplayWeight.toFixed(isLive ? 1 : 0)} kg`,
      delta: isLive ? 'Tải trọng cân cảm biến' : 'Khối lượng lô hàng khai báo',
      up: true,
      icon: Box,
      tint: '#06B6D4',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-[24px] sm:rounded-[30px] border border-orange-950/5 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]"
        >
          <div className="flex items-center justify-between">
            <span
              className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${m.tint}1A`, color: m.tint }}
            >
              <m.icon size={22} />
            </span>
            <ArrowUpRight size={16} className="text-neutral-300 dark:text-neutral-600" />
          </div>
          <p className="mt-3.5 sm:mt-4 text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.12em] text-neutral-400 truncate">
            {m.label}
          </p>
          <div className="mt-1">
            <span className="text-[26px] sm:text-[32px] font-black tracking-tight text-[#1A1A1A] dark:text-[#F5F5F5] block truncate">
              {m.value}
            </span>
          </div>
          <div className={`mt-1.5 text-[11px] sm:text-[12px] font-bold ${m.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {m.delta}
          </div>
        </div>
      ))}
    </div>
  );
}

