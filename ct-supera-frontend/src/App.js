import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SuperaNews from './pages/SuperaNews';
import FormacaoAtletas from './pages/FormacaoAtletas';
import GaleriaFotos from './pages/GaleriaFotos';
import DashboardGerente from './pages/DashboardGerente';
import DashboardProfessor from './pages/DashboardProfessor';
import DashboardAluno from './pages/DashboardAluno';
import AgendamentoPage from './pages/AgendamentoPage';
import CadastroTurmas from './pages/CadastroTurmas';
import EsqueciMinhaSenha from './pages/EsqueciMinhaSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import AtivarConta from './pages/AtivarConta';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './App.css';
import './styles/responsive.css';

// Importe o objeto styles do DashboardGerente
import { styles } from './pages/DashboardGerente';

function CadastroTurmasWrapper() {
  const { centroId } = useParams();
  return <CadastroTurmas centroId={centroId} styles={styles} />;
}

// Componente para proteger rotas que requerem autenticação
function ProtectedRoute({ children, requiredType }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Erro ao parsear usuário do localStorage:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/supera-news" element={<SuperaNews />} />
          <Route path="/alunos" element={<FormacaoAtletas />} />
          <Route path="/formacao-atletas" element={<Navigate to="/alunos" replace />} />
          <Route path="/galeria" element={<GaleriaFotos />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/esqueci-senha" element={<EsqueciMinhaSenha />} />
          <Route path="/redefinir-senha/:uidb64/:token" element={<RedefinirSenha />} />
          <Route path="/ativar-conta/:uidb64/:token" element={<AtivarConta />} />
          <Route path="/agendamento" element={<AgendamentoPage />} />
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
                <CadastroTurmasWrapper />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
