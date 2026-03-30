import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import PagerView, { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafeScreen from '../components/SafeScreen';
import GerenteMainHeader from '../components/GerenteMainHeader';
import { colors } from '../theme';
import { useAuth } from '../utils/AuthContext';
import { funcionarioService } from '../services/api';
import { PainelGerente } from '../types';
import DashboardGerenteScreen from './DashboardGerenteScreen';
import GerenciarUsuariosScreen from './GerenciarUsuariosScreen';
import GerenciarCTsScreen from './GerenciarCTsScreen';
import GerenciarTurmasScreen from './GerenciarTurmasScreen';
import GerenciarSuperaNewsScreen from './GerenciarSuperaNewsScreen';
import GerenciarGaleriaScreen from './GerenciarGaleriaScreen';

type TopKey = 'dashboard' | 'perfil' | 'usuarios' | 'financeiro' | 'relatorios';
type BottomKey = 'cts' | 'turmas' | 'news' | 'galeria';

type FocusState = { area: 'top' | 'bottom'; tab: TopKey | BottomKey };

const TOP_TABS: { key: TopKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'perfil', label: 'Perfil' },
  { key: 'usuarios', label: 'Usuários' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'relatorios', label: 'Relatórios' },
];

const BOTTOM_TABS: { key: BottomKey; label: string }[] = [
  { key: 'cts', label: 'CTs' },
  { key: 'turmas', label: 'Turmas' },
  { key: 'news', label: 'News' },
  { key: 'galeria', label: 'Galeria' },
];

const noopNav = { navigate: () => {} };

function iconTop(key: TopKey): keyof typeof MaterialIcons.glyphMap {
  switch (key) {
    case 'dashboard':
      return 'dashboard';
    case 'perfil':
      return 'person';
    case 'usuarios':
      return 'manage-accounts';
    case 'financeiro':
      return 'account-balance-wallet';
    case 'relatorios':
      return 'assessment';
    default:
      return 'circle';
  }
}

function iconBottom(key: BottomKey): keyof typeof MaterialIcons.glyphMap {
  switch (key) {
    case 'cts':
      return 'business';
    case 'turmas':
      return 'group';
    case 'news':
      return 'article';
    case 'galeria':
      return 'photo-library';
    default:
      return 'circle';
  }
}

function topIndexFromFocus(tab: TopKey | BottomKey): number {
  const i = TOP_TABS.findIndex((t) => t.key === tab);
  return i >= 0 ? i : 0;
}

function bottomIndexFromFocus(tab: TopKey | BottomKey): number {
  const i = BOTTOM_TABS.findIndex((t) => t.key === tab);
  return i >= 0 ? i : 0;
}

function shouldMountNeighborPage(pageIndex: number, activeIndex: number): boolean {
  return Math.abs(pageIndex - activeIndex) <= 1;
}

const GerenteShellScreen: React.FC = () => {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [painel, setPainel] = useState<PainelGerente | null>(null);
  const [focus, setFocus] = useState<FocusState>({ area: 'top', tab: 'dashboard' });

  const topPagerRef = useRef<PagerView>(null);
  const bottomPagerRef = useRef<PagerView>(null);

  useEffect(() => {
    funcionarioService
      .getPainelGerente()
      .then(setPainel)
      .catch(() => setPainel(null));
  }, []);

  /** Ao tocar na barra, alinha o pager (o gesto de arrastar já atualiza o focus via onPageSelected) */
  useEffect(() => {
    if (focus.area === 'top') {
      const i = topIndexFromFocus(focus.tab);
      topPagerRef.current?.setPageWithoutAnimation(i);
    } else {
      const i = bottomIndexFromFocus(focus.tab);
      bottomPagerRef.current?.setPageWithoutAnimation(i);
    }
  }, [focus.area, focus.tab]);

  const onTopPageSelected = (e: PagerViewOnPageSelectedEvent) => {
    const i = e.nativeEvent.position;
    const key = TOP_TABS[i]?.key;
    if (key) setFocus({ area: 'top', tab: key });
  };

  const onBottomPageSelected = (e: PagerViewOnPageSelectedEvent) => {
    const i = e.nativeEvent.position;
    const key = BOTTOM_TABS[i]?.key;
    if (key) setFocus({ area: 'bottom', tab: key });
  };

  /** Índice alvo da aba: barra usa focus; durante o arraste o pager ainda não atualizou focus — vizinhos continuam montados. */
  const topMountCenter = focus.area === 'top' ? topIndexFromFocus(focus.tab) : 0;
  const bottomMountCenter = focus.area === 'bottom' ? bottomIndexFromFocus(focus.tab) : 0;

  const pagerCommonProps =
    Platform.OS === 'android' ? { offscreenPageLimit: 1 as const } : {};

  return (
    <SafeScreen tabScreen style={styles.shell}>
      {painel ? (
        <GerenteMainHeader painel={painel} onLogout={logout} />
      ) : (
        <View style={styles.headerLoading}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}

      <View style={styles.topBarOuter}>
        <View style={styles.topRow}>
          {TOP_TABS.map(({ key, label }) => {
            const focused = focus.area === 'top' && focus.tab === key;
            return (
              <TouchableOpacity
                key={key}
                style={styles.topTabBtn}
                onPress={() => setFocus({ area: 'top', tab: key })}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={iconTop(key)}
                  size={21}
                  color={focused ? colors.primary : colors.textMuted}
                />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  style={[styles.topTabLabel, focused && styles.topTabLabelActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.content}>
        {focus.area === 'top' ? (
          <PagerView
            ref={topPagerRef}
            style={styles.pager}
            initialPage={topIndexFromFocus(focus.tab)}
            onPageSelected={onTopPageSelected}
            {...pagerCommonProps}
          >
            {TOP_TABS.map(({ key }, i) => (
              <View key={key} style={styles.page} collapsable={false}>
                {shouldMountNeighborPage(i, topMountCenter) ? (
                  key === 'usuarios' ? (
                    <GerenciarUsuariosScreen embedded navigation={noopNav} route={{}} />
                  ) : (
                    <DashboardGerenteScreen
                      embedded
                      shellActiveTop={key as 'dashboard' | 'perfil' | 'financeiro' | 'relatorios'}
                      navigation={noopNav}
                      route={{}}
                    />
                  )
                ) : (
                  <View style={styles.pagePlaceholder} />
                )}
              </View>
            ))}
          </PagerView>
        ) : (
          <PagerView
            ref={bottomPagerRef}
            style={styles.pager}
            initialPage={bottomIndexFromFocus(focus.tab)}
            onPageSelected={onBottomPageSelected}
            {...pagerCommonProps}
          >
            <View style={styles.page} collapsable={false}>
              {shouldMountNeighborPage(0, bottomMountCenter) ? (
                <GerenciarCTsScreen embedded navigation={noopNav} route={{}} />
              ) : (
                <View style={styles.pagePlaceholder} />
              )}
            </View>
            <View style={styles.page} collapsable={false}>
              {shouldMountNeighborPage(1, bottomMountCenter) ? (
                <GerenciarTurmasScreen embedded navigation={noopNav} route={{}} />
              ) : (
                <View style={styles.pagePlaceholder} />
              )}
            </View>
            <View style={styles.page} collapsable={false}>
              {shouldMountNeighborPage(2, bottomMountCenter) ? (
                <GerenciarSuperaNewsScreen embedded navigation={noopNav} route={{}} />
              ) : (
                <View style={styles.pagePlaceholder} />
              )}
            </View>
            <View style={styles.page} collapsable={false}>
              {shouldMountNeighborPage(3, bottomMountCenter) ? (
                <GerenciarGaleriaScreen embedded navigation={noopNav} route={{}} />
              ) : (
                <View style={styles.pagePlaceholder} />
              )}
            </View>
          </PagerView>
        )}
      </View>

      <View style={[styles.bottomRow, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        {BOTTOM_TABS.map(({ key, label }) => {
          const focused = focus.area === 'bottom' && focus.tab === key;
          return (
            <TouchableOpacity
              key={key}
              style={styles.tabBtn}
              onPress={() => setFocus({ area: 'bottom', tab: key })}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={iconBottom(key)}
                size={22}
                color={focused ? colors.primary : colors.textMuted}
              />
              <Text numberOfLines={1} style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerLoading: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarOuter: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  topTabBtn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
  },
  topTabLabel: {
    fontSize: 11,
    lineHeight: 13,
    color: colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  topTabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pagePlaceholder: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 6,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 56,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 76,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

export default GerenteShellScreen;
