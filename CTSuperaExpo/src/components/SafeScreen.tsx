import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Telas com abas inferiores: aplica apenas topo e laterais (evita faixa vazia sobre a tab bar). */
  tabScreen?: boolean;
};

const TAB_EDGES = ['top', 'left', 'right'] as const;

/**
 * Área segura confiável (status bar, notch, Dynamic Island).
 * Prefira isto ao SafeAreaView do react-native, que falha em vários Androids.
 */
export default function SafeScreen({ children, style, tabScreen }: Props) {
  return (
    <SafeAreaView style={[{ flex: 1 }, style]} edges={tabScreen ? TAB_EDGES : undefined}>
      {children}
    </SafeAreaView>
  );
}
