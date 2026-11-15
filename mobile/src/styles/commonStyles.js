import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 3,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(249, 87, 22, 0.08)',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F95716',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

