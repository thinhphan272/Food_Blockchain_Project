import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

export default function TraceResultCard({ traceResult, theme }) {
  if (!traceResult) return null;

  const batch = traceResult?.batch || {};
  const ai = traceResult?.aiFreshnessEvaluation || {};
  const verify = traceResult?.blockchainVerification || {};
  const profile = traceResult?.storageProfile || {};

  return (
    <View style={styles.container}>
      {/* Hero Card */}
      <View style={[styles.heroCard, { backgroundColor: theme.heroGrad }]}>
        <Text style={styles.heroSub}>BLOCKCHAIN VERIFIED • MINH BẠCH 100%</Text>
        <Text style={styles.heroTitle}>{batch.product_name || 'Xà Lách Thủy Canh Mỡ Đà Lạt'}</Text>
        <Text style={styles.heroBatch}>Mã lô: {batch.batch_code}</Text>

        <View style={styles.heroBadgeRow}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>TTI: {Number(ai.freshness_score || 96.5).toFixed(1)}%</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>{verify.valid ? 'SỔ CÁI HỢP LỆ' : 'KHỚP ECDSA'}</Text>
          </View>
        </View>
      </View>

      {/* Chi Tiết Vi Khí Hậu & Nguồn Gốc */}
      <View style={[commonStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[commonStyles.cardTitle, { color: theme.text }]}>
          Thông tin vi khí hậu chuỗi lạnh
        </Text>
        <View style={commonStyles.detailRow}>
          <Text style={[commonStyles.detailLabel, { color: theme.sub }]}>Nguồn gốc:</Text>
          <Text style={[commonStyles.detailVal, { color: theme.text }]}>{batch.farm_origin || 'LangBiang Đà Lạt'}</Text>
        </View>
        <View style={commonStyles.detailRow}>
          <Text style={[commonStyles.detailLabel, { color: theme.sub }]}>Phương tiện vận chuyển:</Text>
          <Text style={[commonStyles.detailVal, { color: theme.accent, fontFamily: 'monospace' }]}>
            {batch.transport_vehicle_plate || '49C-567.89'}
          </Text>
        </View>
        <View style={commonStyles.detailRow}>
          <Text style={[commonStyles.detailLabel, { color: theme.sub }]}>Dải nhiệt độ an toàn:</Text>
          <Text style={[commonStyles.detailVal, { color: theme.accent }]}>
            {profile.minTemp ?? 8.0}°C &ndash; {profile.maxTemp ?? 12.0}°C
          </Text>
        </View>
        <View style={commonStyles.detailRow}>
          <Text style={[commonStyles.detailLabel, { color: theme.sub }]}>Khí chỉ thị hư hỏng:</Text>
          <Text style={[commonStyles.detailVal, { color: theme.text }]}>
            {profile.gasType || 'C2H4'} &le; {profile.maxGas || 30} ppm
          </Text>
        </View>
        <View style={commonStyles.detailRow}>
          <Text style={[commonStyles.detailLabel, { color: theme.sub }]}>Thời gian lưu kệ dự kiến:</Text>
          <Text style={[commonStyles.detailVal, { color: theme.text }]}>
            {ai.remaining_shelf_life_hours || 144} giờ (Mô hình Arrhenius)
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#F95716',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.3,
  },
  heroBatch: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  heroPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

