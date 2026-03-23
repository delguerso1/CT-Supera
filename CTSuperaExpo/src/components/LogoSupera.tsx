import React from 'react';
import {
  View,
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

/** Mesmo arquivo usado no site (`/logo-supera-principal.png`). */
const LOGO_SUPERA = require('../../assets/logo-supera-principal.png');

/** Padding horizontal típico do conteúdo (ex.: login 20+20). */
const CONTENT_HORIZONTAL_PAD = 40;

type Props = {
  /** Telas de login / destaque: ocupa quase toda a largura útil. */
  variant?: 'hero' | 'compact';
  style?: StyleProp<ImageStyle>;
};

export default function LogoSupera({ variant = 'hero', style }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const contentW = Math.max(windowWidth - CONTENT_HORIZONTAL_PAD, 200);

  let w: number;
  let h: number;
  let marginBottom: number;

  if (variant === 'hero') {
    // Quase largura total; limite alto para telas grandes (logo bem visível).
    w = Math.min(contentW * 0.98, 440);
    h = w * 0.36;
    marginBottom = 8;
  } else {
    w = Math.min(contentW * 0.9, 360);
    h = w * 0.36;
    marginBottom = 16;
  }

  const size = {
    width: Math.round(w),
    height: Math.round(h),
    marginBottom,
  };

  return (
    <View style={styles.wrap}>
      <Image
        source={LOGO_SUPERA}
        style={[styles.img, size, style]}
        resizeMode="contain"
        accessibilityLabel="Logo CT Supera"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    transform: [{ translateX: -4 }],
  },
});
