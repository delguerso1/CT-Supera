import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { candidaturaTrabalhoService } from '../services/api';
import { CandidaturaTrabalho } from '../types';
import { NavigationProps } from '../types';
import SafeScreen from '../components/SafeScreen';
import { colors } from '../theme';

function formatarData(iso: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function modalidades(c: CandidaturaTrabalho) {
  const p: string[] = [];
  if (c.interesse_praia) p.push('Praia');
  if (c.interesse_quadra) p.push('Quadra');
  return p.length ? p.join(' · ') : '—';
}

const GerenciarCandidaturasTrabalhoScreen: React.FC<NavigationProps> = ({ embedded }) => {
  const { user } = useAuth();
  const [lista, setLista] = useState<CandidaturaTrabalho[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const wrap = (children: React.ReactNode) =>
    embedded ? (
      <View style={styles.container}>{children}</View>
    ) : (
      <SafeScreen tabScreen style={styles.container}>
        {children}
      </SafeScreen>
    );

  const carregar = useCallback(async () => {
    const data = await candidaturaTrabalhoService.listar();
    setLista(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (user?.tipo !== 'gerente') return;
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        await carregar();
      } catch (e: any) {
        if (!cancel) {
          Alert.alert(
            'Erro',
            e.response?.data?.error || 'Não foi possível carregar as candidaturas.'
          );
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user?.tipo, carregar]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await carregar();
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Falha ao atualizar.');
    } finally {
      setRefreshing(false);
    }
  };

  const abrirPdf = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o PDF.');
    });
  };

  if (user?.tipo !== 'gerente') {
    return wrap(
      <View style={styles.centered}>
        <Text style={styles.errorText}>Acesso negado. Apenas gerentes visualizam candidatos.</Text>
      </View>
    );
  }

  if (loading) {
    return wrap(
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>Carregando candidaturas…</Text>
      </View>
    );
  }

  return wrap(
    <FlatList
      data={lista}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <Text style={styles.headerText}>
          Candidaturas da página Trabalhe conosco. Toque em &quot;Abrir PDF&quot; para ver o currículo.
        </Text>
      }
      ListEmptyComponent={<Text style={styles.muted}>Nenhuma candidatura ainda.</Text>}
      contentContainerStyle={lista.length === 0 ? styles.emptyPad : styles.listPad}
      renderItem={({ item: c }) => (
        <View style={styles.card}>
          <Text style={styles.nome}>{c.nome_completo}</Text>
          <Text style={styles.meta}>{formatarData(c.data_envio)}</Text>
          <Text style={styles.line}>
            {c.tipo_vaga_display || c.tipo_vaga} · {modalidades(c)}
          </Text>
          <Text style={styles.line}>{c.email}</Text>
          <Text style={styles.line}>{c.telefone}</Text>
          {c.periodo_ed_fis ? (
            <Text style={styles.line}>Período Ed. Fís.: {c.periodo_ed_fis}</Text>
          ) : null}
          {c.mensagem ? <Text style={styles.msg}>{c.mensagem}</Text> : null}
          {c.curriculo_url ? (
            <TouchableOpacity style={styles.btnPdf} onPress={() => abrirPdf(c.curriculo_url!)}>
              <Text style={styles.btnPdfText}>Abrir PDF</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: 15,
  },
  muted: {
    color: colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  headerText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listPad: {
    padding: 12,
    paddingBottom: 24,
  },
  emptyPad: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  nome: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  line: {
    fontSize: 14,
    color: colors.text,
    marginTop: 6,
  },
  msg: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 10,
    fontStyle: 'italic',
  },
  btnPdf: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnPdfText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default GerenciarCandidaturasTrabalhoScreen;
