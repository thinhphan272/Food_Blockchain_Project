import React from 'react';
import { View, Text } from 'react-native';
import { commonStyles } from '../styles/commonStyles';

export default function PosResultCard({ posStatus, theme }) {
  if (!posStatus) return null;

  const isSuccess = posStatus.httpCode === 200;

  return (
    <View
      style={[
        commonStyles.card,
        {
          backgroundColor: theme.card,
          borderColor: isSuccess ? theme.success : theme.danger,
        },
      ]}
    >
      <Text
        style={[
          commonStyles.cardTitle,
          { color: isSuccess ? theme.success : theme.danger },
        ]}
      >
        {isSuccess
          ? 'THANH TOÁN THÀNH CÔNG (200 OK)'
          : 'CẢNH BÁO: TEM ĐÃ TỪNG THANH TOÁN (409 CONFLICT)'}
      </Text>
      <Text style={[commonStyles.cardDesc, { color: theme.text, marginTop: 4 }]}>
        {posStatus.message || JSON.stringify(posStatus)}
      </Text>
      {!isSuccess && (
        <Text style={{ color: theme.danger, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
          Cơ chế khóa phân tán đã phát hiện và chặn thành công hành vi quét lại tem đã bán!
        </Text>
      )}
    </View>
  );
}

