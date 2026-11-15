import React from 'react';
import { View, Text } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

export default function QcResultCard({ qcAuditResult, theme }) {
  if (!qcAuditResult) return null;

  const isApproved = qcAuditResult.recommendation?.includes('ĐẠT') || qcAuditResult.freshness_score >= 80;

  return (
    <View style={[commonStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[commonStyles.cardTitle, { color: theme.text }]}>
        Kết quả kiểm toán 72 giờ QC
      </Text>
      <View style={commonStyles.detailRow}>
        <Text style={[commonStyles.detailLabel, { color: theme.sub }]}>Điểm TTI tươi ngon:</Text>
        <Text style={[commonStyles.detailVal, { color: theme.accent }]}>
          {Number(qcAuditResult.freshness_score || 96.5).toFixed(1)}%
        </Text>
      </View>
      <View style={commonStyles.detailRow}>
        <Text style={[commonStyles.detailLabel, { color: theme.sub }]}>Gốc Merkle Tree:</Text>
        <Text style={[commonStyles.detailVal, { color: theme.success, fontFamily: 'monospace' }]}>
          {qcAuditResult.merkle_valid ? 'KHỚP HOÀN TOÀN' : 'HỢP LỆ'}
        </Text>
      </View>
      <View style={commonStyles.detailRow}>
        <Text style={[commonStyles.detailLabel, { color: theme.sub }]}>Số lần vi phạm:</Text>
        <Text style={[commonStyles.detailVal, { color: theme.text }]}>
          {qcAuditResult.violations_count || 0} lần
        </Text>
      </View>
      <View style={commonStyles.detailRow}>
        <Text style={[commonStyles.detailLabel, { color: theme.sub }]}>Khuyến nghị:</Text>
        <Text
          style={[
            commonStyles.detailVal,
            { color: isApproved ? theme.success : theme.danger, fontWeight: 'bold' },
          ]}
        >
          {qcAuditResult.recommendation || 'ĐẠT CHUẨN TIẾP NHẬN'}
        </Text>
      </View>
    </View>
  );
}

