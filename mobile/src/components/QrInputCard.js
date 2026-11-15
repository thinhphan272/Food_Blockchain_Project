import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { commonStyles } from '../styles/commonStyles';

const QUICK_CODES = ['LOT-VEG-2026-001', 'LOT-FISH-2026-001', 'LOT-MEAT-2026-002'];

export default function QrInputCard({
  qrInput,
  setQrInput,
  activeRole,
  loading,
  onScanTrace,
  onRunQcAudit,
  onPosCheckout,
  theme,
}) {
  return (
    <View style={[commonStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[commonStyles.cardTitle, { color: theme.text }]}>
        Mã QR lô hàng / tem sản phẩm
      </Text>
      <Text style={[commonStyles.cardDesc, { color: theme.sub }]}>
        Nhập hoặc quét mã vạch / tem QR từ camera di động:
      </Text>

      {/* Input */}
      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.bg,
          },
        ]}
        value={qrInput}
        onChangeText={setQrInput}
        placeholder="Ví dụ: LOT-VEG-2026-001"
        placeholderTextColor={theme.sub}
        autoCapitalize="characters"
      />

      {/* Quick Select Chips */}
      <View style={styles.chipsRow}>
        {QUICK_CODES.map((code) => (
          <TouchableOpacity
            key={code}
            onPress={() => setQrInput(code)}
            style={[styles.chip, { backgroundColor: theme.accentLight }]}
          >
            <Text style={[styles.chipText, { color: theme.accent }]}>{code}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Button */}
      <View style={styles.actionRow}>
        {activeRole === 'CONSUMER' && (
          <TouchableOpacity
            onPress={onScanTrace}
            disabled={loading}
            style={[commonStyles.primaryBtn, { backgroundColor: theme.accent }]}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={commonStyles.btnText}>Tra cứu hộ chiếu số</Text>
            )}
          </TouchableOpacity>
        )}

        {activeRole === 'INBOUND_QC' && (
          <TouchableOpacity
            onPress={onRunQcAudit}
            disabled={loading}
            style={[commonStyles.primaryBtn, { backgroundColor: theme.accent }]}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={commonStyles.btnText}>Kiểm toán TTI 72h</Text>
            )}
          </TouchableOpacity>
        )}

        {activeRole === 'POS_CASHIER' && (
          <TouchableOpacity
            onPress={onPosCheckout}
            disabled={loading}
            style={[commonStyles.primaryBtn, { backgroundColor: theme.accent }]}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={commonStyles.btnText}>Thanh toán & hủy tem</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 10.5,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
  },
});

