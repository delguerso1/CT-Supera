import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const styles = {
  container: {
    maxWidth: '900px',
    margin: '40px auto',
    padding: '32px',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  title: {
    color: '#1F6C86',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  text: {
    color: '#333',
    lineHeight: '1.6',
    fontSize: '14px',
    whiteSpace: 'pre-line',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '20px',
  },
  button: {
    backgroundColor: '#1F6C86',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '20px',
  },
  error: {
    color: '#d32f2f',
    marginTop: '12px',
  },
  success: {
    color: '#2e7d32',
    marginTop: '12px',
  },
};

const contratoTexto = `TERMO DE MATRÍCULA, RESPONSABILIDADE E ACORDO DE USO DE DADOS (LGPD) – CT SUPERA
1. IDENTIFICAÇÃO E AUTORIZAÇÃO
O presente termo vincula-se aos dados cadastrais preenchidos previamente neste sistema web referentes ao ALUNO(A) e, quando aplicável, ao seu RESPONSÁVEL LEGAL. Ao dar o aceite neste termo, o responsável declara, para todos os efeitos legais, que autoriza o(a) menor indicado no cadastro a participar das aulas ministradas pelo CT SUPERA.
2. DECLARAÇÃO DE SAÚDE E RISCOS
Declaro que estou ciente de que é recomendável conversar com um médico antes de iniciar ou aumentar o nível de atividade física pretendido, assumindo plena responsabilidade pela realização de qualquer atividade física sem o atendimento desta recomendação. Declaro ainda que entregarei/anexarei o atestado médico, por exigência do CT SUPERA, no prazo de, no máximo, 20 (vinte) dias a contar desta data. Declaro que tenho conhecimento e assumo integralmente a responsabilidade pelos riscos inerentes às minhas participações (ou dos meus dependentes) e que gozamos de boa saúde física para tais atividades.
3. DIREITO DE IMAGEM
Fica o CT SUPERA autorizado a usar o nome e imagem do aluno/candidato gratuitamente, para fins de ampla divulgação por qualquer meio utilizado pela mídia em geral (redes sociais, site, impressos), do qual declaro ter plena e total ciência.
4. PROTEÇÃO DE DADOS (LGPD) E SISTEMA WEB
Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o(a) ALUNO(A)/RESPONSÁVEL autoriza o CT SUPERA a realizar a coleta e o tratamento de seus dados pessoais preenchidos neste sistema.
Finalidade: Os dados serão utilizados exclusivamente para fins de cadastro, gestão financeira, controle de frequência, emissão de cobranças e contato em casos de emergência.
Sistema Web: O(A) contratante declara estar ciente de que seus dados serão armazenados e processados em sistema web de gestão esportiva utilizado pelo CT SUPERA, com acesso restrito à administração e professores, visando a organização das aulas e segurança do aluno.
Direitos: É garantido ao titular dos dados o direito de acesso, correção e, mediante solicitação formal e rescisão contratual, a exclusão dos dados, salvo aqueles que a lei obrigue a guarda por prazo determinado.

5. ORIENTAÇÕES GERAIS E CONTRATUAIS
Seja bem-vindo(a) ao Centro de Treinamento SUPERA VÔLEI. Para que nossa parceria seja forte e duradoura, estabelecemos as seguintes normas que regem a prestação de serviço:
Pontualidade: Chegue de preferência 15 minutos antes do início da sua aula para preparar seu corpo e material. O professor estará pronto para lhe atender no horário contratado.
Horário Fixo: O horário escolhido será seu horário FIXO de treino. Não cabem trocas aleatórias durante a semana. Caso necessite de troca de horário PERMANENTE, comunique a administração.
Preparação: Sugerimos o uso de protetor solar, roupas leves, óculos de proteção solar e garrafa d’água. Alimente-se antes da prática para garantir um bom rendimento.
Duração: O tempo de treino é de, aproximadamente, 1 (uma) hora por sessão.
Vigência Mensal: Você está contratando um serviço mensal. Ele se inicia no primeiro dia de cada mês e termina no último dia do mês.
Alunos Novos (Proporcionalidade): Do dia 20 em diante de cada mês, caso seja um(a) aluno(a) novo(a), será cobrada normalmente a matrícula, porém a mensalidade daquele respectivo mês será proporcional aos dias restantes.
Matrícula e Uniforme: No primeiro ato, é paga uma matrícula no valor de R$90,00 e a respectiva mensalidade. O valor da matrícula já inclui o fornecimento de 01 (uma) camisa de treino do CT SUPERA.
Observação: Nos meses subsequentes, paga-se somente a mensalidade. Se o(a) aluno(a) se ausentar por 2 (dois) meses sem pagamento, ao retornar, será cobrada nova taxa de matrícula.
Pagamentos: O(A) aluno(a) deverá informar a melhor data para pagamento (dias 01, 05 ou 10). Caso ocorra atraso no pagamento da mensalidade, será cobrado multa de 2% da mensalidade mais 1% de mora por mês. Evite atrasos.
Condições Climáticas: Como o exercício é ao ar livre, poderá haver cancelamento em caso de chuva forte, raios ou condições adversas. O aviso será dado com antecedência mínima de 20 minutos.
Reposição: Em nenhuma hipótese os treinos cancelados por condições climáticas (item anterior) terão reposição.
6. DO ACEITE E ASSINATURA ELETRÔNICA
A aceitação deste contrato se dá de forma eletrônica. Ao selecionar a opção "Li e Concordo" (ou similar) e finalizar o cadastro/matrícula neste sistema, o(a) CONTRATANTE expressa sua concordância integral e irrevogável com todos os termos acima descritos.
Este aceite eletrônico gera registros de data, hora e IP (Identificação de Protocolo de Internet), possuindo plena validade jurídica e substituindo, para todos, os fins de direito, a assinatura física em papel, conforme art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e legislação vigente.`;

function ContratoAceite() {
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleAceitar = async () => {
    if (!aceite) {
      setError('Você precisa aceitar o contrato para continuar.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const response = await api.post('usuarios/aceitar-contrato/');
      if (response.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      setSuccess('Contrato aceito com sucesso! Redirecionando...');
      setTimeout(() => navigate('/dashboard/aluno'), 800);
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao registrar aceite. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Contrato e Aceite</h2>
      <div style={styles.text}>{contratoTexto}</div>
      <div style={styles.checkboxRow}>
        <input
          id="aceite-contrato"
          type="checkbox"
          checked={aceite}
          onChange={(e) => setAceite(e.target.checked)}
        />
        <label htmlFor="aceite-contrato">
          Li e concordo com os termos acima.
        </label>
      </div>
      <button
        type="button"
        onClick={handleAceitar}
        style={{
          ...styles.button,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
        disabled={loading}
      >
        {loading ? 'Registrando...' : 'Confirmar aceite'}
      </button>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}
    </div>
  );
}

export default ContratoAceite;
