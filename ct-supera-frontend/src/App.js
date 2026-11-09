import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SuperaNews from './pages/SuperaNews';
import GaleriaFotos from './pages/GaleriaFotos';
import DashboardGerente from './pages/DashboardGerente';
import DashboardProfessor from './pages/DashboardProfessor';
import DashboardAluno from './pages/DashboardAluno';
import ContratoAceite from './pages/ContratoAceite';
import AgendamentoPage from './pages/AgendamentoPage';
import ReagendamentoPage from './pages/ReagendamentoPage';
import EsqueciMinhaSenha from './pages/EsqueciMinhaSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import AtivarConta from './pages/AtivarConta';
import TrabalheConoscoPage from './pages/TrabalheConoscoPage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './App.css';
import './styles/responsive.css';

function RedirectTurmasCentro() {
  const { centroId } = useParams();
  return <Navigate to={`/dashboard/gerente?section=centros&centro=${centroId}`} replace />;
}

function readStoredUser() {
  const storedUser = localStorage.getItem('user');
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch (error) {
    console.error('Erro ao parsear usuário do localStorage:', error);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
}

// Componente para proteger rotas que requerem autenticação.
// O usuário é relido do localStorage quando a rota muda ou quando o painel
// atualiza o cadastro (aceite do contrato / PAR-Q). Sem isso, o aluno fica
// preso na tela do questionário até fazer login de novo.
function ProtectedRoute({ children, requiredType, allowContractAccess = false }) {
  const location = useLocation();
  const [authVersion, setAuthVersion] = useState(0);

  useEffect(() => {
    const syncUser = () => setAuthVersion((version) => version + 1);
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  const user = useMemo(
    () => readStoredUser(),
    [authVersion, location.pathname, location.search, location.key]
  );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.tipo === 'aluno' && user.contrato_aceito === false) {
    if (!allowContractAccess) {
      return <Navigate to="/contrato" replace />;
    }
  }

  if (allowContractAccess && user.tipo === 'aluno' && user.contrato_aceito) {
    const parqPendente = user.parq_completed !== true && user.parq_completed !== 'true';
    return <Navigate to={parqPendente ? "/dashboard/aluno?section=parq" : "/dashboard/aluno"} replace />;
  }

  const isAlunoComParqPendente =
    user.tipo === 'aluno' &&
    user.contrato_aceito !== false &&
    user.parq_completed !== true &&
    user.parq_completed !== 'true';

  if (isAlunoComParqPendente) {
    const section = new URLSearchParams(location.search).get('section');
    const estaNaTelaParq = location.pathname === '/dashboard/aluno' && section === 'parq';
    if (!estaNaTelaParq) {
      return <Navigate to="/dashboard/aluno?section=parq" replace />;
    }
  }

  if (requiredType && user.tipo !== requiredType) {
    return <Navigate to="/" replace />;
  }

  return React.cloneElement(children, { user });
}

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="main-content-offset">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/supera-news" element={<SuperaNews />} />
          <Route path="/alunos" element={<Navigate to="/" replace />} />
          <Route path="/formacao-atletas" element={<Navigate to="/" replace />} />
          <Route path="/galeria" element={<GaleriaFotos />} />
          <Route path="/trabalhe-conosco" element={<TrabalheConoscoPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/esqueci-senha" element={<EsqueciMinhaSenha />} />
          <Route path="/redefinir-senha/:uidb64/:token" element={<RedefinirSenha />} />
          <Route path="/ativar-conta/:uidb64/:token" element={<AtivarConta />} />
          <Route path="/agendamento" element={<AgendamentoPage />} />
          <Route path="/agendamento/reagendar" element={<ReagendamentoPage />} />
          <Route 
            path="/contrato" 
            element={
              <ProtectedRoute requiredType="aluno" allowContractAccess>
                <ContratoAceite />
              </ProtectedRoute>
            } 
          />
          {/* Rotas protegidas */}
          <Route 
            path="/dashboard/gerente" 
            element={
              <ProtectedRoute requiredType="gerente">
                <DashboardGerente />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/professor" 
            element={
              <ProtectedRoute requiredType="professor">
                <DashboardProfessor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/aluno" 
            element={
              <ProtectedRoute requiredType="aluno">
                <DashboardAluno />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/centros/:centroId/turmas"
            element={
              <ProtectedRoute requiredType="gerente">
                <RedirectTurmasCentro />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
