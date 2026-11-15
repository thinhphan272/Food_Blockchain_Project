import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const ROLES = [
  { id: 'CONSUMER', label: 'Khách hàng' },
  { id: 'INBOUND_QC', label: 'Thủ kho QC' },
  { id: 'POS_CASHIER', label: 'Thu ngân POS' },
];

export default function RoleTabs({ activeRole, setActiveRole, theme }) {
  return (
    <View style={[styles.roleTabsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.roleTabs}>
        {ROLES.map((tab) => {
          const active = activeRole === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveRole(tab.id)}
              style={[
                styles.roleTab,
                active
                  ? { backgroundColor: theme.accent, shadowColor: theme.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 }
                  : { backgroundColor: theme.accentLight },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.roleTabText,
                  active ? { color: '#FFFFFF', fontWeight: '800' } : { color: theme.sub, fontWeight: '600' },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  roleTabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  roleTabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTabText: {
    fontSize: 12,
  },
});

