# Funcionalidades: Supera News e Galeria de Fotos

## 📋 Resumo

Implementação de funcionalidades para adicionar e gerenciar imagens nas páginas **Supera News** e **Galeria de Fotos**, com permissões exclusivas para usuários do tipo **Gerente**.

## 🎯 Funcionalidades Implementadas

### Backend (Django)

#### 1. Modelos Criados (`ct/models.py`)

**SuperaNews:**
- `titulo`: Título da notícia
- `descricao`: Descrição ou conteúdo da notícia
- `imagem`: Imagem da notícia (upload_to='supera_news/')
- `autor`: Usuário que criou (relacionamento com modelo Usuario)
- `data_criacao`: Data de criação (automático)
- `data_atualizacao`: Data da última atualização (automático)
- `ativo`: Se a notícia está ativa/visível

**GaleriaFoto:**
- `titulo`: Título da foto
- `descricao`: Descrição ou legenda da foto (opcional)
- `imagem`: Imagem da galeria (upload_to='galeria_fotos/')
- `autor`: Usuário que criou (relacionamento com modelo Usuario)
- `data_criacao`: Data de criação (automático)
- `data_atualizacao`: Data da última atualização (automático)
- `ativo`: Se a foto está ativa/visível

#### 2. API Endpoints (`ct/views.py` e `ct/urls.py`)

**Supera News:**
- `GET /api/cts/supera-news/` - Listar todas as notícias ativas (público)
- `POST /api/cts/supera-news/criar/` - Criar nova notícia (apenas gerentes)
- `PUT /api/cts/supera-news/editar/<id>/` - Editar notícia (apenas gerentes)
- `DELETE /api/cts/supera-news/excluir/<id>/` - Excluir notícia (apenas gerentes)

**Galeria de Fotos:**
- `GET /api/cts/galeria/` - Listar todas as fotos ativas (público)
- `POST /api/cts/galeria/criar/` - Adicionar nova foto (apenas gerentes)
- `PUT /api/cts/galeria/editar/<id>/` - Editar foto (apenas gerentes)
- `DELETE /api/cts/galeria/excluir/<id>/` - Excluir foto (apenas gerentes)

#### 3. Permissões

- ✅ **Visualização**: Todos os usuários (incluindo não autenticados)
- ✅ **Criação**: Apenas gerentes autenticados
- ✅ **Edição**: Apenas gerentes autenticados
- ✅ **Exclusão**: Apenas gerentes autenticados

### Frontend (React)

#### 1. Página Supera News (`ct-supera-frontend/src/pages/SuperaNews.js`)

**Funcionalidades:**
- Listagem de todas as notícias em cards com layout em grid responsivo
- Visualização de imagem, título, descrição, autor e data
- Botão "Adicionar Notícia" (visível apenas para gerentes)
- Modal para criação de notícias com:
  - Campo de título
  - Campo de descrição
  - Upload de imagem
- Botão de exclusão em cada notícia (visível apenas para gerentes)
- Efeitos hover nos cards
- Mensagens de erro e loading

#### 2. Página Galeria de Fotos (`ct-supera-frontend/src/pages/GaleriaFotos.js`)

**Funcionalidades:**
- Listagem de todas as fotos em cards com layout em grid responsivo
- Visualização de imagem, título, descrição (opcional), autor e data
- Botão "Adicionar Foto" (visível apenas para gerentes)
- Modal para adição de fotos com:
  - Campo de título
  - Campo de descrição (opcional)
  - Upload de imagem
- Modal de visualização ampliada da imagem ao clicar
- Botão de exclusão em cada foto (visível apenas para gerentes)
- Efeitos hover nos cards
- Mensagens de erro e loading

## 🔧 Configuração

### Migrations

As migrations já foram criadas e aplicadas:

```bash
python manage.py makemigrations ct
python manage.py migrate
```

### Diretórios de Media

As imagens serão salvas em:
- Supera News: `media/supera_news/`
- Galeria de Fotos: `media/galeria_fotos/`

## 🧪 Como Testar

### 1. Como Usuário Gerente

1. Faça login com uma conta de gerente
2. Acesse `/supera-news` ou `/galeria`
3. Clique no botão "➕ Adicionar Notícia" ou "➕ Adicionar Foto"
4. Preencha o formulário:
   - Título (obrigatório)
   - Descrição (obrigatória para notícias, opcional para fotos)
   - Imagem (obrigatória)
5. Clique em "Publicar" ou "Adicionar"
6. A notícia/foto será exibida no grid
7. Para excluir, clique no botão "Excluir" em qualquer card

### 2. Como Usuário Não-Gerente ou Visitante

1. Acesse `/supera-news` ou `/galeria`
2. Visualize todas as notícias/fotos disponíveis
3. Clique nas fotos da galeria para visualizá-las ampliadas
4. Os botões de adicionar e excluir NÃO estarão visíveis

## 🎨 Design

- **Cores principais**: 
  - Azul escuro (#1a237e) para elementos principais
  - Vermelho (#d32f2f) para botões de exclusão
  - Cinza (#999) para botões secundários
- **Layout**: Grid responsivo que se adapta ao tamanho da tela
- **Efeitos**: Hover com elevação nos cards
- **Modais**: Overlay escuro com conteúdo centralizado

## 📝 Admin Django

Os modelos também foram registrados no Django Admin para facilitar o gerenciamento:

- Acesse `/admin`
- Navegue para "Supera News" ou "Fotos da Galeria"
- Você pode criar, editar e excluir itens diretamente pelo admin

## 🔒 Segurança

- Todas as rotas de criação, edição e exclusão verificam se o usuário é gerente
- Tentativas de acesso não autorizado retornam erro 403 (Forbidden)
- Upload de imagens com validação de tipo de arquivo
- Autenticação via token nas requisições

## 📦 Dependências

Já incluídas no `requirements.txt`:
- `Pillow>=10.0.0` - Para processamento de imagens
- `djangorestframework` - Para a API REST
- `django-cors-headers` - Para CORS

## 🚀 Próximos Passos (Opcional)

- Adicionar paginação para muitas notícias/fotos
- Implementar edição inline de notícias/fotos
- Adicionar categorias ou tags
- Implementar busca e filtros
- Adicionar funcionalidade de compartilhamento

