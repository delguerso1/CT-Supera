# 🔍 Checklist para Verificar Deploy das Funcionalidades

## 1. Limpar Cache do Navegador

### Opção 1: Modo Anônimo/Privado
- **Chrome/Edge**: `Ctrl + Shift + N`
- **Firefox**: `Ctrl + Shift + P`
- Acesse o site no modo anônimo para testar sem cache

### Opção 2: Limpar Cache Completamente
- `Ctrl + Shift + Delete`
- Marcar "Imagens e arquivos em cache"
- Período: "Todo o período"
- Clicar em "Limpar dados"

### Opção 3: Reload Forçado
- `Ctrl + F5` ou `Ctrl + Shift + R`

## 2. Verificar no Servidor (SSH)

```bash
# Conectar ao servidor
ssh seu_usuario@seu_servidor

# Navegar para o diretório do projeto
cd /root/ct-supera

# Verificar se o build do frontend foi atualizado
ls -lh ct-supera-frontend/build/index.html
ls -lh ct-supera-frontend/build/static/js/*.js | head -5

# Coletar arquivos estáticos
source venv/bin/activate
python manage.py collectstatic --noinput

# Reiniciar o serviço
sudo systemctl restart ctsupera_hostinger
# ou
sudo systemctl restart gunicorn
```

## 3. Verificar Console do Navegador

1. Abra a página (Supera News ou Galeria)
2. Abra o DevTools: `F12`
3. Vá para a aba **Console**
4. Procure por erros em vermelho
5. Vá para a aba **Network**
6. Recarregue a página (`F5`)
7. Verifique se os arquivos .js estão sendo carregados com status 200

## 4. Testar Funcionalidade Passo a Passo

### Como Gerente:

1. **Login**:
   - Faça login com uma conta de gerente
   - Verifique se o tipo de usuário está correto

2. **Verificar localStorage**:
   - Abra o DevTools (`F12`)
   - Vá para a aba **Application** (ou Storage)
   - Clique em **Local Storage** → seu domínio
   - Verifique o objeto `user`:
     ```json
     {
       "tipo": "gerente",
       ...
     }
     ```

3. **Acessar as páginas**:
   - `/supera-news` - Deve aparecer botão "➕ Adicionar Notícia"
   - `/galeria` - Deve aparecer botão "➕ Adicionar Foto"

## 5. Se AINDA NÃO APARECER o Botão

### Verificar se a API está funcionando:

```bash
# No servidor
curl -X GET http://localhost:8000/api/cts/supera-news/
curl -X GET http://localhost:8000/api/cts/galeria/
```

### Forçar rebuild no servidor:

```bash
# No servidor
cd /root/ct-supera/ct-supera-frontend

# Instalar dependências
npm install

# Fazer build
npm run build

# Coletar estáticos
cd ..
source venv/bin/activate
python manage.py collectstatic --noinput --clear

# Reiniciar serviço
sudo systemctl restart ctsupera_hostinger
```

## 6. Verificação do Código

### No Console do navegador, execute:

```javascript
// Verificar se o usuário está logado como gerente
const user = JSON.parse(localStorage.getItem('user'));
console.log('Tipo de usuário:', user?.tipo);
console.log('É gerente?', user?.tipo === 'gerente');

// Verificar se a API está acessível
fetch('/api/cts/supera-news/')
  .then(r => r.json())
  .then(d => console.log('Notícias:', d))
  .catch(e => console.error('Erro:', e));
```

## 7. Problema Comum: CORS ou Proxy

Se estiver rodando localmente e tentando acessar API em produção:

1. Verificar o arquivo `.env` ou variáveis de ambiente
2. Verificar `REACT_APP_API_URL` em `ct-supera-frontend/src/services/api.js`
3. Garantir que aponta para o servidor correto

## 8. Último Recurso: Deploy Manual

Se nada funcionar, fazer deploy manual completo:

```bash
# Local (seu computador)
cd ct-supera-frontend
npm run build

# Copiar build para servidor
scp -r build/* usuario@servidor:/root/ct-supera/ct-supera-frontend/build/

# No servidor
cd /root/ct-supera
source venv/bin/activate
python manage.py collectstatic --noinput --clear
sudo systemctl restart ctsupera_hostinger
```

## ✅ Checklist Final

- [ ] Cache do navegador limpo
- [ ] Testado em modo anônimo
- [ ] Console do navegador sem erros
- [ ] User.tipo === 'gerente' no localStorage
- [ ] API retorna dados: `/api/cts/supera-news/`
- [ ] Serviço reiniciado no servidor
- [ ] collectstatic executado
- [ ] Build do frontend atualizado

