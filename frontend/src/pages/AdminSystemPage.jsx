import React from 'react';
import {
  Database,
  Layers,
  Lightning,
  Activity,
  Target,
  Thermometer,
} from '../components/MomentumIcons';

export default function AdminSystemPage({
  batches = [],
  telemetryList = [],
  getCassandraCsvExportUrl,
  getMongoJsonExportUrl,
  foodCategories = [],
}) {
  const CARD =
    'rounded-[28px] border border-orange-950/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
            Quản lý hệ thống
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Tổng quan trạng thái và hiệu năng 5 cơ sở dữ liệu chuyên biệt
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={getCassandraCsvExportUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-full border border-orange-950/10 dark:border-orange-500/20 text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:text-[#F95716] transition-colors"
          >
            Xuất CSV Cassandra
          </a>
          <a
            href={getMongoJsonExportUrl()}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 rounded-full border border-orange-950/10 dark:border-orange-500/20 text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:text-[#F95716] transition-colors"
          >
            Xuất JSON MongoDB
          </a>
        </div>
      </div>

      {/* 5 NoSQL Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {[
          { name: 'MySQL 8.0', role: 'RBAC & Storage Profiles', status: 'ONLINE', count: '6 Profiles', icon: Database, tint: '#0284C7' },
          { name: 'MongoDB 6.0', role: 'Polymorphic & Ledger', status: 'ONLINE', count: `${batches.length} Lô Hàng`, icon: Layers, tint: '#10B981' },
          { name: 'Redis 7.0', role: 'FEFO ZSET & Lock', status: 'ONLINE', count: 'Active Lock', icon: Lightning, tint: '#F95716' },
          { name: 'Cassandra 4.1', role: 'Time-Series Telemetry', status: 'ONLINE', count: `${telemetryList.length} Điểm Đo`, icon: Activity, tint: '#8B5CF6' },
          { name: 'Neo4j 5.x', role: 'Multi-Hop Recall Graph', status: 'ONLINE', count: '<0.02s Cypher', icon: Target, tint: '#F59E0B' },
        ].map((db) => (
          <div
            key={db.name}
            className="rounded-[22px] sm:rounded-[28px] border border-orange-950/5 bg-white p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]"
          >
            <div className="flex items-center justify-between">
              <span
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${db.tint}1A`, color: db.tint }}
              >
                <db.icon size={17} />
              </span>
              <span className="text-[9.5px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {db.status}
              </span>
            </div>
            <div className="text-[13px] sm:text-sm font-bold mt-2.5 sm:mt-3 text-[#1A1A1A] dark:text-[#F5F5F5]">{db.name}</div>
            <div className="text-[10.5px] sm:text-[11px] text-neutral-400 mt-0.5 truncate">{db.role}</div>
            <div className="text-[10.5px] sm:text-[11px] font-mono font-bold text-[#F95716] mt-2">{db.count}</div>
          </div>
        ))}
      </div>

      {/* Storage Profiles Editor */}
      <div className={CARD}>
        <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] mb-4 flex items-center gap-2">
          <Thermometer size={18} className="text-[#F95716]" />
          Cấu hình 6 quy chuẩn vi khí hậu (MySQL + Cache Redis)
        </h3>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-orange-950/5 dark:border-orange-500/10 text-neutral-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-3">Mã Ngành Hàng</th>
                <th className="pb-3">Tên Phân Hệ</th>
                <th className="pb-3">Dải Nhiệt Độ An Toàn</th>
                <th className="pb-3">Ngưỡng Khí Gas</th>
                <th className="pb-3">Quy Chuẩn Vi Khí Hậu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-950/5 dark:divide-orange-500/10">
              {foodCategories.map((cat) => (
                <tr key={cat.code} className="hover:bg-orange-950/[0.01] dark:hover:bg-white/[0.01]">
                  <td className="py-3 font-mono font-bold text-[#F95716]">{cat.code}</td>
                  <td className="py-3 font-semibold">{cat.name}</td>
                  <td className="py-3 font-mono">{cat.temp}</td>
                  <td className="py-3 font-mono text-amber-500">{cat.gas}</td>
                  <td className="py-3 text-neutral-400">{cat.rule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

