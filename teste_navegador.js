// TESTE NO CONSOLE DO NAVEGADOR
// Abra o DevTools (F12), cole este código no Console e pressione Enter

console.log("=== TESTE DE DIAGNÓSTICO ===");

// 1. Verificar se está logado
const user = JSON.parse(localStorage.getItem('user'));
console.log("1. Usuário logado:", user);
console.log("   - Tipo:", user?.tipo);
console.log("   - É gerente?", user?.tipo === 'gerente');

// 2. Verificar token
const token = localStorage.getItem('token');
console.log("2. Token presente:", token ? "✅ Sim" : "❌ Não");

// 3. Testar API de notícias
fetch('/api/cts/supera-news/', {
  headers: {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(response => {
    console.log("3. API Supera News:");
    console.log("   - Status:", response.status);
    return response.json();
  })
  .then(data => {
    console.log("   - Dados recebidos:", data);
  })
  .catch(error => {
    console.error("   - Erro:", error);
  });

// 4. Testar API de galeria
fetch('/api/cts/galeria/', {
  headers: {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json'
  }
})
  .then(response => {
    console.log("4. API Galeria:");
    console.log("   - Status:", response.status);
    return response.json();
  })
  .then(data => {
    console.log("   - Dados recebidos:", data);
  })
  .catch(error => {
    console.error("   - Erro:", error);
  });

console.log("=== FIM DO TESTE ===");
console.log("Por favor, copie todos os resultados acima e envie para análise");

