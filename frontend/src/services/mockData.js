// Dữ liệu mẫu chuẩn khớp 100% với Interface Contract
export const mockProfiles = [
  { categoryCode: "VEG_FRUIT", categoryName: "Rau Củ Quả Tươi", minTemp: 8.0, maxTemp: 12.0, maxGas: 30.0, gasType: "C2H4" },
  { categoryCode: "CHILLED_MEAT", categoryName: "Thịt Tươi Sống Mát", minTemp: 0.0, maxTemp: 4.0, maxGas: 40.0, gasType: "NH3" },
  { categoryCode: "FRESH_SEAFOOD", categoryName: "Thủy Hải Sản Tươi Ướp Đá", minTemp: 0.0, maxTemp: 2.0, maxGas: 25.0, gasType: "TMA" },
  { categoryCode: "DAIRY", categoryName: "Sữa Tươi Thanh Trùng", minTemp: 2.0, maxTemp: 6.0, maxGas: 0.0, gasType: "NONE" },
  { categoryCode: "DEEP_FROZEN", categoryName: "Thực Phẩm Đông Lạnh Sâu", minTemp: -30.0, maxTemp: -18.0, maxGas: 10.0, gasType: "NONE" }
];

export const mockBatchResponse = {
  batchCode: "LOT-VEG-2026-001",
  productName: "Xà Lách Thủy Canh Mỡ Đà Lạt",
  category: "VEG_FRUIT",
  farmName: "Hợp Tác Xã Rau Sạch Đà Lạt",
  txHash: "3f9a7b5c1d8e2f4a6b0c9e7d5f3a1b8c6e4d2f0a8b7c5e3d1f9a6b4c2e0d8f1a",
  status: "CREATED",
  unitCount: 100
};

export const mockQcAudit = {
  batchCode: "LOT-VEG-2026-001",
  ttiScore: 99.1,
  freshnessStatus: "XUAT_SAC",
  tempCompliancePercent: 99.5,
  totalBreachDurationMinutes: 0,
  history: [
    { time: "08:00", temp: 9.2, hum: 90 },
    { time: "09:00", temp: 9.5, hum: 91 },
    { time: "10:00", temp: 10.1, hum: 89 },
    { time: "11:00", temp: 9.8, hum: 92 }
  ]
};

export const mockPosItem = {
  serialCode: "QR-ITEM-VEG-001-005",
  productName: "Xà Lách Thủy Canh (Túi 300g)",
  price: 35000,
  status: "PACKED"
};
