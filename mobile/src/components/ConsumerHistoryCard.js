import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const PURCHASES = [
  {
    id: 'ORD-9812',
    name: 'Xà Lách Thủy Canh Mỡ Đà Lạt (500g)',
    batch: 'LOT-VEG-2026-001',
    date: '14/11/2026 - 16:30',
    price: '38.000 đ',
    tti: '100% Tươi',
    store: 'Co.opmart Tân Phú',
  },
  {
    id: 'ORD-9541',
    name: 'Cá Hồi Na Uy Phi Lê Sashimi (300g)',
    batch: 'LOT-FISH-2026-001',
    date: '12/11/2026 - 10:15',
    price: '185.000 đ',
    tti: '98% Tươi',
    store: 'Co.opmart Quận 1',
  },
  {
    id: 'ORD-9204',
    name: 'Sữa Tươi Thanh Trùng Đà Lạt Milk (950ml)',
    batch: 'LOT-DAIRY-2026-005',
    date: '10/11/2026 - 19:40',
    price: '46.000 đ',
    tti: '100% Chuẩn Lạnh',
    store: 'Co.opmart Quận 7',
  },
];

export default function ConsumerHistoryCard({ onSelectBatch, theme }) {
  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        LỊCH SỬ NÔNG SẢN ĐÃ MUA ({PURCHASES.length})
      </Text>

      {PURCHASES.map((item) => (
        <View
          key={item.id}
          style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={styles.topRow}>
            <Text style={[styles.itemId, { color: theme.sub }]}>{item.id}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.tti}</Text>
            </View>
          </View>

          <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>

          <View style={styles.infoRow}>
            <Text style={[styles.storeText, { color: theme.sub }]}>📍 {item.store}</Text>
            <Text style={[styles.priceText, { color: theme.accent }]}>{item.price}</Text>
          </View>

          <TouchableOpacity
            onPress={() => onSelectBatch && onSelectBatch(item.batch)}
            style={[styles.traceBtn, { backgroundColor: theme.accentLight }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.traceBtnText, { color: theme.accent }]}>
              Tra Cứu Lô: {item.batch} ↗
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemId: {
    fontSize: 11,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  storeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '900',
  },
  traceBtn: {
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  traceBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
});

