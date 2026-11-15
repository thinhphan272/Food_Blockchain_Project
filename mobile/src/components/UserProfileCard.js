import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function UserProfileCard({ currentUser, onLogout, theme }) {
  if (!currentUser) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarText}>
            {(currentUser.fullName || currentUser.username || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]}>
            {currentUser.fullName || currentUser.username}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{currentUser.role}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: theme.sub }]}>TÊN ĐĂNG NHẬP</Text>
          <Text style={[styles.infoVal, { color: theme.text }]}>{currentUser.username}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: theme.sub }]}>SỐ ĐIỆN THOẠI</Text>
          <Text style={[styles.infoVal, { color: theme.text }]}>
            {currentUser.phone || '0988-123-456'}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: theme.sub }]}>ĐƠN VỊ / PHÒNG BAN</Text>
          <Text style={[styles.infoVal, { color: theme.text }]}>
            {currentUser.department || 'Vận Hành'}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, { color: theme.sub }]}>ĐỊNH DANH PHÂN BỔ</Text>
          <Text style={[styles.infoVal, { color: theme.text }]}>
            {currentUser.assignedEntity ||
              (currentUser.role === 'LOGISTICS_DRIVER'
                ? 'Xe Lạnh 49C-567.89'
                : currentUser.role === 'CONSUMER'
                ? 'Thành Viên Kim Cương'
                : 'Trạm Vận Hành Tân Phú')}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onLogout}
        style={styles.logoutFullBtn}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutFullBtnText}>ĐĂNG XUẤT TÀI KHOẢN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F95716',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(249, 87, 22, 0.15)',
    marginTop: 4,
  },
  roleText: {
    color: '#F95716',
    fontSize: 10,
    fontWeight: '800',
  },
  divider: {
    height: 1,
  },
  infoGrid: {
    gap: 10,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  logoutFullBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  logoutFullBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

