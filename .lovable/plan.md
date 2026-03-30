

# Salsa Hub — Dashboard de Gestão de Produtos

## Visão Geral
Webapp completo para gerenciar produtos digitais (Apps, Infoprodutos, E-commerce, Landing Pages), organizar equipes de 6-20 pessoas, com chat interno e upload de documentos. Design "Green Kinetic Noir" com fundo escuro, verde vibrante (#91f78e), cantos arredondados grandes, tipografia Manrope, sem bordas — seguindo fielmente o DESIGN.md.

## Design System
- **Cores**: Fundo obsidian (#0e0e0e), superfícies em camadas (#131313, #1a1a1a, #20201f), verde primário (#91f78e), acentos amarelo/rosa para status
- **Tipografia**: Manrope, hierarquia editorial com display grande para estados vazios
- **Componentes**: Cantos ultra-arredondados (3xl), sem bordas (separação por tons), glassmorphism em modais, logo parsley como marca d'água sutil
- **Responsivo**: Mobile-first, navegação bottom bar no mobile, sidebar no desktop

## Páginas e Funcionalidades

### 1. Dashboard Principal (Home)
- Saudação personalizada ("Hi, [Nome]") com porcentagem de tarefas completas
- Cards de resumo: Campanhas ativas, Reuniões do dia, Chamadas planejadas, Atividade de leads
- Notificações com contagem
- Visão rápida dos produtos em andamento

### 2. Página de Produtos (Lista)
- Grid de cards com todos os produtos organizados por tipo (App, Infoproduto, E-commerce, Landing Page)
- Filtros por status (Em desenvolvimento, Lançado, Pausado)
- Botão para adicionar novo produto
- Cada card mostra: nome, tipo, progresso, equipe responsável

### 3. Página Individual do Produto
- Header com imagem/ícone do produto, nome e status
- Abas: **Visão Geral** | **Documentos** | **Equipe** | **Planejamento** | **Apps Vinculados**
- **Visão Geral**: Descrição, métricas, timeline, gráfico de progresso
- **Documentos**: Upload e listagem de arquivos (PDFs, imagens, docs) com storage do Lovable Cloud
- **Equipe**: Membros atribuídos ao produto com roles
- **Planejamento**: Kanban simples (To Do, Em Progresso, Concluído) com tarefas
- **Apps Vinculados**: Links para ferramentas externas (URLs de apps, plataformas)

### 4. Marketing / Campanhas
- Lista de campanhas vinculadas aos produtos
- Status e progresso de cada campanha
- Métricas visuais (gráficos de barras, donut charts)

### 5. Calendário / Chamadas Planejadas
- Vista de tabela e calendário
- Reuniões agendadas com horário e participantes
- Integração com produtos/projetos

### 6. Contatos / Equipe
- Lista de membros da equipe com busca
- Perfil do membro: nome, telefone, email, cargo, projetos
- Cards verdes para destaque (como na referência)

### 7. Chat / Mensagens
- Lista de conversas (por equipe/departamento)
- Chat em tempo real usando Lovable Cloud (Supabase Realtime)
- Canais: por produto, por equipe, direto entre membros
- Indicador de mensagens não lidas

### 8. Perfil do Usuário
- Dados pessoais editáveis
- Projetos vinculados
- Campanhas ativas

### 9. Notificações
- Feed de notificações (novo chat, nova tarefa, atualização de produto)
- Filtros: Novas / Todas

## Navegação
- **Desktop**: Sidebar colapsável à esquerda com ícones e labels
- **Mobile**: Bottom navigation bar com 5 itens (Home, Chat, Tarefas, Contatos, Perfil)

## Backend (Lovable Cloud)
- **Auth**: Login por email/senha
- **Tabelas**: profiles, products, documents, tasks, team_members, messages, channels, campaigns, notifications
- **Storage**: Bucket para upload de documentos dos produtos
- **Realtime**: Chat em tempo real entre membros

## Assets
- Logo parsley.png será incorporada como ícone da marca Salsa Hub
- Marca d'água sutil do parsley em telas grandes (como na referência com a estrela)

