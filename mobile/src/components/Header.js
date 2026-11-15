import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function Header({ currentUser, onLogout, isDark, setIsDark, theme }) {
  return (
    <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.brandGroup}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoMark}>❖</Text>
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: theme.text }]}>SmartChain</Text>
            <Text style={[styles.brandSub, { color: theme.sub }]}>
              {currentUser ? `${currentUser.fullName} (${currentUser.role})` : 'Enterprise Cold-Chain'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsGroup}>
          <TouchableOpacity
            onPress={() => setIsDark(!isDark)}
            style={[styles.actionBtn, { backgroundColor: theme.accentLight }]}
            activeOpacity={0.8}
          >
            <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>
              {isDark ? '☀️' : '🌙'}
            </Text>
          </TouchableOpacity>

          {currentUser && (
            <TouchableOpacity
              onPress={onLogout}
              style={[styles.logoutBtn]}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutBtnText}>Đăng Xuất</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F95716',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F95716',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  logoMark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 180,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
});
