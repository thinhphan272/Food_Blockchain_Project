import React, { useState } from 'react';
import { mockProfiles, mockBatchResponse, mockQcAudit, mockPosItem } from './services/mockData';
import { ShieldCheck, Cpu, Database, QrCode, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [posStatus, setPosStatus] = useState(mockPosItem.status);
  const [posWarning, setPosWarning] = useState(false);

  const handleCheckout = () => {
    if (posStatus === 'SOLD') {
      setPosWarning(true);
    } else {
      setPosStatus('SOLD');
      setPosWarning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-emerald-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-emerald-300" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">SmartChain Supermarket Traceability</h1>
              <p className="text-xs text-emerald-200">Blockchain + IoT Wokwi + Polyglot NoSQL (Farm to Fork)</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs bg-emerald-800 px-3 py-1.5 rounded-full border border-emerald-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Môi trường: Sẵn sàng phát triển (Mock Mode: ON)</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 ${activeTab === 'overview' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Tổng quan Nhóm & Phân công
          </button>
          <button
            onClick={() => setActiveTab('profiles')}
            className={`py-3 border-b-2 ${activeTab === 'profiles' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Ngưỡng Bảo Quản 6 Ngành Hàng
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`py-3 border-b-2 ${activeTab === 'pos' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Thử nghiệm Quầy POS (Anti-Fraud)
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Chào mừng các thành viên dự án SmartChain!</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Repository đã được khởi tạo hoàn chỉnh khung dự án Monorepo. Cả 3 thành viên có thể làm việc độc lập 100% nhờ cơ chế 
                <strong> Contract-First & Mock Data</strong>, không ai phải đợi ai.
              </p>
            </div>

            {/* Role Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-emerald-600">
                <div className="flex items-center space-x-2 text-emerald-700 font-bold mb-2">
                  <Database className="w-5 h-5" />
                  <span>Dev 1: Tech Lead & Backend</span>
                </div>
                <p className="text-xs text-slate-500 mb-3 font-semibold">Phụ trách: @thinhphan272</p>
                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                  <li>Spring Boot 3.x & Security JWT</li>
                  <li>Tích hợp 5 Database NoSQL (C*, Mongo, Redis, Neo4j, MySQL)</li>
                  <li>Thuật toán SHA-256 HashChain & TTI Arrhenius</li>
                </ul>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-sky-600">
                <div className="flex items-center space-x-2 text-sky-700 font-bold mb-2">
                  <QrCode className="w-5 h-5" />
                  <span>Dev 2: Frontend Lead (UI/UX)</span>
                </div>
                <p className="text-xs text-slate-500 mb-3 font-semibold">Phụ trách: Thành viên 2</p>
                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                  <li>React Vite + TailwindCSS Components</li>
                  <li>Vẽ biểu đồ Chart.js vi khí hậu Realtime</li>
                  <li>Bản đồ GPS Leaflet & Quét mã QR Camera</li>
                </ul>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-purple-600">
                <div className="flex items-center space-x-2 text-purple-700 font-bold mb-2">
                  <Cpu className="w-5 h-5" />
                  <span>Dev 3: IoT & Embedded Lead</span>
                </div>
                <p className="text-xs text-slate-500 mb-3 font-semibold">Phụ trách: Thành viên 3</p>
                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                  <li>Firmware ESP32 C++ trên Wokwi Simulator</li>
                  <li>Đọc cảm biến DHT22, Biến trở Gas/Loadcell</li>
                  <li>Truyền MQTT 5s & Kích hoạt Rơ-le cưỡng bức</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profiles' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Danh mục Ngưỡng Bảo Quản Vi Khí Hậu Chuẩn (6 Ngành Hàng)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Mã Ngành Hàng</th>
                    <th className="py-3 px-4">Tên Sản Phẩm</th>
                    <th className="py-3 px-4">Nhiệt Độ Chuẩn</th>
                    <th className="py-3 px-4">Độ Ẩm Tối Đa</th>
                    <th className="py-3 px-4">Khí Chỉ Thị Ôi Thiu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockProfiles.map((p) => (
                    <tr key={p.categoryCode} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">{p.categoryCode}</td>
                      <td className="py-3 px-4">{p.categoryName}</td>
                      <td className="py-3 px-4">{p.minTemp}°C đến {p.maxTemp}°C</td>
                      <td className="py-3 px-4">85% - 95% RH</td>
                      <td className="py-3 px-4"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-xs">{p.gasType} (&lt; {p.maxGas} ppm)</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-xl mx-auto space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Thử Nghiệm Quét Bán Hàng Tại POS & Chống Tem Tái Sử Dụng</h2>
            <p className="text-xs text-slate-500">Mô phỏng cơ chế Redis Redlock và chuyển trạng thái tem sang SOLD.</p>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Mã tem quét:</span>
                <span className="font-mono font-bold">{mockPosItem.serialCode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Sản phẩm:</span>
                <span className="font-semibold">{mockPosItem.productName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Giá bán:</span>
                <span className="font-bold text-emerald-700">{mockPosItem.price.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="flex justify-between text-sm items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500">Trạng thái tem:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${posStatus === 'SOLD' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {posStatus}
                </span>
              </div>
            </div>

            {posWarning && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center space-x-2 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span><strong>CẢNH BÁO GIAN LẬN:</strong> Tem này đã được thanh toán lúc 08:30! Phát hiện hành vi tái sử dụng tem giả mạo!</span>
              </div>
            )}

            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-colors"
            >
              Quét Bán Hàng (Checkout)
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Đồ án Tốt Nghiệp / Môn học IoT & NoSQL — Nhóm 3 (Thịnh Phan, Dev 2, Dev 3) — Đại học Công Thương TP.HCM (HUIT)
      </footer>
    </div>
  );
}

export default App;
