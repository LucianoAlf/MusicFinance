# MusicFinance - Regras do Projeto

## Stack

- **Frontend**: React 19, TypeScript, Vite 6
- **UI**: Tailwind CSS 4, Radix UI, Lucide Icons, Motion
- **Backend**: Supabase (Auth, Database, RLS)
- **Charts**: Recharts
- **Deploy**: Vercel
- **Dados**: date-fns, papaparse, xlsx

## Convenções

### Código
- Linguagem do código (variáveis, funções, comments): **inglês**
- UI/textos para o usuário: **português (BR)**
- Imports com alias `@/` para a raiz do projeto
- Componentes funcionais com hooks (sem classes)
- Estado global via React Context (AuthContext, DataContext)

### Commits
- Usar **Conventional Commits** (feat, fix, refactor, perf, docs, chore)
- Mensagens em **português**
- Exemplo: `fix(auth): corrigir race condition no login`

### Banco de Dados
- Todas as tabelas com **RLS habilitado**
- Queries via Supabase JS Client (não SQL direto no frontend)
- Multi-tenant: isolamento por `tenant_id` via RLS policies

## Arquitetura

- `src/context/AuthContext.tsx` - Autenticação e seleção de escola
- `src/context/DataContext.tsx` - Dados da escola selecionada
- `src/pages/` - Páginas (Dashboard, Financial, Professors, etc.)
- `src/components/` - Componentes reutilizáveis
- `src/lib/` - Utilitários (supabase client, helpers)

## Skills

Consultar as skills em `.claude/skills/` **proativamente** antes de implementar. Invocar automaticamente quando:
- Escrevendo queries/schemas Supabase → `supabase-postgres-best-practices`, `postgresql-optimization`
- Criando/editando componentes React → `vercel-react-best-practices`, `vercel-composition-patterns`, `react-state-management`
- Trabalhando com estilos/UI → `tailwind-design-system`, `web-design-guidelines`, `frontend-design`
- TypeScript avançado → `typescript-advanced-types`
- Configuração Vite → `vite`
- Testes → `vitest`, `webapp-testing`
- Deploy → `deploy-to-vercel`
- Commits → `conventional-commit`, `git-commit`
- Revisão de código → `code-review-excellence`, `architecture-patterns`
- Manipulação de planilhas → `xlsx`
