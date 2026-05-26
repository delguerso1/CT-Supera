import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { wellhubService } from '../services/api';
import { CadastroWellhub, NavigationProps, WellhubTurmaOpcao } from '../types';
import SafeScreen from '../components/SafeScreen';
import { colors } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  formatarLabelSemana,
  podeSemanaAnterior,
  podeSemanaProxima,
  semanaAnteriorIso,
  semanaInicioPadrao,
  semanaPadraoAtual,
  semanaProximaIso,
} from '../utils/wellhubSemana';

type Props = NavigationProps & { embedded?: boolean };

const GerenciarCadastrosWellhubScreen: React.FC<Props> = ({ embedded }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<CadastroWellhub[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaInput, setBuscaInput] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [semanaInicio, setSemanaInicio] = useState(() => semanaPadraoAtual());
  const [turmaFiltro, setTurmaFiltro] = useState<number | null>(null);
  const [turmasOpcoes, setTurmasOpcoes] = useState<WellhubTurmaOpcao[]>([]);
  const [editando, setEditando] = useState<CadastroWellhub | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefone: '',
    observacoes: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const wrap = (children: React.ReactNode) =>
    embedded ? (
      <View style={styles.container}>{children}</View>
    ) : (
      <SafeScreen tabScreen style={styles.container}>
        {children}
      </SafeScreen>
    );

  const mesApi = `${ano}-${String(mes).padStart(2, '0')}`;

  const filtrosApi = useCallback(
    () => ({
      q: termoBusca || undefined,
      mes: mesApi,
      semana_inicio: semanaInicio,
      turma_id: turmaFiltro,
    }),
    [termoBusca, mesApi, semanaInicio, turmaFiltro]
  );

  const filtrosForaDoPadrao = () => {
    const n = new Date();
    return (
      mes !== n.getMonth() + 1 ||
      ano !== n.getFullYear() ||
      semanaInicio !== semanaInicioPadrao(ano, mes) ||
      turmaFiltro != null ||
      !!termoBusca
    );
  };

  useEffect(() => {
    setSemanaInicio(semanaInicioPadrao(ano, mes));
  }, [ano, mes]);

  const handleMesAnterior = () => {
    setMes((prev) => {
      if (prev === 1) {
        setAno((current) => current - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleMesProximo = () => {
    setMes((prev) => {
      if (prev === 12) {
        setAno((current) => current + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const carregar = useCallback(async () => {
    const data = await wellhubService.listarCadastros(filtrosApi());
    setLista(data);
  }, [filtrosApi]);

  useEffect(() => {
    if (user?.tipo !== 'gerente') return;
    wellhubService.listarTurmasOpcoes().then(setTurmasOpcoes).catch(() => setTurmasOpcoes([]));
  }, [user?.tipo]);

  useEffect(() => {
    if (user?.tipo !== 'gerente') return;
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        await carregar();
      } catch (e: any) {
        if (!cancel) {
          Alert.alert('Erro', e.response?.data?.error || 'Não foi possível carregar cadastros Wellhub.');
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user?.tipo, carregar]);

  const aplicarBusca = () => setTermoBusca(buscaInput.trim());

  const limparBusca = () => {
    setBuscaInput('');
    setTermoBusca('');
  };

  const limparFiltros = () => {
    const n = new Date();
    const m = n.getMonth() + 1;
    const y = n.getFullYear();
    setMes(m);
    setAno(y);
    setSemanaInicio(semanaInicioPadrao(y, m));
    setTurmaFiltro(null);
    limparBusca();
  };

  const abrirEdicao = async (id: number) => {
    try {
      const data = await wellhubService.obterCadastro(id, filtrosApi());
      setEditando(data);
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        telefone: data.telefone || '',
        observacoes: data.observacoes || '',
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o cadastro.');
    }
  };

  const salvar = async () => {
    if (!editando?.id) return;
    setSalvando(true);
    try {
      await wellhubService.atualizarCadastro(editando.id, form);
      setEditando(null);
      await carregar();
      Alert.alert('Sucesso', 'Cadastro atualizado.');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const sincronizar = async () => {
    setSyncing(true);
    try {
      const res = await wellhubService.sincronizarSlots();
      Alert.alert('Wellhub', res.message || 'Sincronização concluída.');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.error || 'Falha na sincronização.');
    } finally {
      setSyncing(false);
    }
  };

  if (user?.tipo !== 'gerente') {
    return wrap(
      <View style={styles.centered}>
        <Text style={styles.noData}>Acesso negado.</Text>
      </View>
    );
  }

  return wrap(
    <>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Gerenciar Cadastros Wellhub</Text>
          <TouchableOpacity
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            onPress={sincronizar}
            disabled={syncing}
          >
            <Text style={styles.syncButtonText}>{syncing ? 'Sync…' : 'Sincronizar slots'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.monthControls}>
          <Text style={styles.filterLabel}>Mês:</Text>
          <TouchableOpacity style={styles.monthButton} onPress={handleMesAnterior}>
            <Text style={styles.monthButtonText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {String(mes).padStart(2, '0')}/{ano}
          </Text>
          <TouchableOpacity style={styles.monthButton} onPress={handleMesProximo}>
            <Text style={styles.monthButtonText}>▶</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.yearInput}
            value={String(ano)}
            onChangeText={(value) => {
              const parsed = Number(value);
              if (!Number.isNaN(parsed)) {
                setAno(parsed);
              }
            }}
            keyboardType="numeric"
            placeholder="Ano"
            placeholderTextColor={colors.textMuted}
            maxLength={4}
          />
        </View>

        <View style={styles.weekControls}>
          <Text style={styles.filterLabel}>Semana:</Text>
          <TouchableOpacity
            style={[styles.monthButton, !podeSemanaAnterior(semanaInicio, ano, mes) && styles.btnDisabled]}
            onPress={() => setSemanaInicio(semanaAnteriorIso(semanaInicio))}
            disabled={!podeSemanaAnterior(semanaInicio, ano, mes)}
          >
            <Text style={styles.monthButtonText}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{formatarLabelSemana(semanaInicio)}</Text>
          <TouchableOpacity
            style={[styles.monthButton, !podeSemanaProxima(semanaInicio, ano, mes) && styles.btnDisabled]}
            onPress={() => setSemanaInicio(semanaProximaIso(semanaInicio))}
            disabled={!podeSemanaProxima(semanaInicio, ano, mes)}
          >
            <Text style={styles.monthButtonText}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Turma:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, turmaFiltro === null && styles.filterChipActive]}
              onPress={() => setTurmaFiltro(null)}
            >
              <Text
                style={[styles.filterChipText, turmaFiltro === null && styles.filterChipTextActive]}
              >
                Todas
              </Text>
            </TouchableOpacity>
            {turmasOpcoes.map((t) => {
              const ativo = turmaFiltro === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.filterChip, ativo && styles.filterChipActive]}
                  onPress={() => setTurmaFiltro(t.id)}
                >
                  <Text style={[styles.filterChipText, ativo && styles.filterChipTextActive]}>
                    {t.horario}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {filtrosForaDoPadrao() && (
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionSecondary]}
              onPress={limparFiltros}
            >
              <Text style={styles.actionButtonText}>Limpar filtros</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Buscar:</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Nome, e-mail ou telefone"
            placeholderTextColor={colors.textMuted}
            value={buscaInput}
            onChangeText={setBuscaInput}
            onSubmitEditing={aplicarBusca}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.actionButton} onPress={aplicarBusca}>
            <Text style={styles.actionButtonText}>Buscar</Text>
          </TouchableOpacity>
          {!!termoBusca && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionSecondary]}
              onPress={limparBusca}
            >
              <Text style={styles.actionButtonText}>Limpar busca</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : lista.length === 0 ? (
          <Text style={styles.noData}>
            {filtrosForaDoPadrao()
              ? 'Nenhum cadastro encontrado para os filtros selecionados.'
              : 'Nenhum cadastro Wellhub encontrado.'}
          </Text>
        ) : (
          <ScrollView>
            {lista.map((c) => (
              <View key={c.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {c.nome_completo || `${c.first_name} ${c.last_name || ''}`.trim()}
                </Text>
                <Text style={styles.cardSubtitle}>{c.email || '—'}</Text>
                <Text style={styles.cardSubtitle}>{c.telefone || '—'}</Text>
                {c.ultima_reserva && (
                  <Text style={styles.cardSubtitle}>
                    Turma {c.ultima_reserva.horario} — {c.ultima_reserva.data_aula} (
                    {c.ultima_reserva.status_display || c.ultima_reserva.status})
                  </Text>
                )}
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => abrirEdicao(c.id)}>
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Modal visible={!!editando} animationType="slide" transparent onRequestClose={() => setEditando(null)}>
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 8 }]}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar cadastro Wellhub</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {(['first_name', 'last_name', 'email', 'telefone'] as const).map((field) => (
                <View key={field}>
                  <Text style={styles.fieldLabel}>
                    {field === 'first_name'
                      ? 'Nome'
                      : field === 'last_name'
                        ? 'Sobrenome'
                        : field === 'email'
                          ? 'E-mail'
                          : 'Telefone'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={form[field]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                    keyboardType={
                      field === 'email' ? 'email-address' : field === 'telefone' ? 'phone-pad' : 'default'
                    }
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              ))}
              <Text style={styles.fieldLabel}>Observações</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={form.observacoes}
                onChangeText={(v) => setForm((f) => ({ ...f, observacoes: v }))}
                multiline
                placeholderTextColor={colors.textMuted}
              />
              {editando?.reservas && editando.reservas.length > 0 && (
                <View style={styles.reservasBox}>
                  <Text style={styles.fieldLabel}>Reservas recentes</Text>
                  {editando.reservas.slice(0, 10).map((r) => (
                    <Text key={r.id} style={styles.reservaItem}>
                      {r.data_aula} {r.turma_horario} — {r.status_display || r.status}
                    </Text>
                  ))}
                </View>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionSecondary]}
                onPress={() => setEditando(null)}
                disabled={salvando}
              >
                <Text style={styles.actionButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={salvar} disabled={salvando}>
                <Text style={styles.actionButtonText}>{salvando ? 'Salvando…' : 'Salvar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  content: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  syncButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  filterActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#fff',
    minHeight: 40,
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  weekControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginHorizontal: 4,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  monthButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  monthButtonText: {
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
  monthLabel: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  yearInput: {
    marginLeft: 8,
    width: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  filterScroll: {
    flex: 1,
    maxHeight: 40,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.chipInactive,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  actionSecondary: {
    backgroundColor: '#9e9e9e',
  },
  actionButtonText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  loadingText: {
    marginTop: 8,
    color: colors.textSecondary,
  },
  noData: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '92%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    color: colors.text,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reservasBox: {
    marginBottom: 8,
  },
  reservaItem: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
});

export default GerenciarCadastrosWellhubScreen;
