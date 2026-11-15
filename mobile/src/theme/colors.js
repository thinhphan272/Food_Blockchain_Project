export const getThemeTokens = (isDark) => {
  if (isDark) {
    return {
      bg: '#120C08',
      card: '#1C140F',
      border: 'rgba(249, 87, 22, 0.15)',
      text: '#F5F5F5',
      sub: '#9CA3AF',
      accent: '#F95716',
      accentLight: 'rgba(249, 87, 22, 0.15)',
      heroGrad: '#E0430B',
      success: '#10B981',
      danger: '#EF4444',
      warning: '#F59E0B',
    };
  }
  return {
    bg: '#F6F3F0',
    card: '#FFFFFF',
    border: 'rgba(26, 10, 2, 0.06)',
    text: '#1A1A1A',
    sub: '#6B7280',
    accent: '#F95716',
    accentLight: 'rgba(249, 87, 22, 0.10)',
    heroGrad: '#FF8A4C',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
  };
};

