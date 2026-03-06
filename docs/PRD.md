# MusicFinance — Product Requirements Document (PRD)

**Versao:** 1.0  
**Data:** 2026-03-06  
**Autor:** Luciano Alf / LA Music School  
**Status:** Em producao (MVP)

---

## 1. Visao Geral do Produto

### 1.1 O que e o MusicFinance

MusicFinance e uma plataforma SaaS multi-tenant de gestao financeira projetada exclusivamente para escolas de musica. Oferece dashboard com KPIs em tempo real, controle de professores e alunos, gestao de receitas e despesas, contas a pagar, DRE automatico e painel administrativo para a mentoria **Maestros da Gestao**.

### 1.2 Problema que Resolve

Diretores de escolas de musica geralmente controlam financas em planilhas Excel ou sistemas genericos que nao atendem as particularidades do setor: professores com multiplos alunos, custos por aluno, folha de pagamento variavel, inadimplencia por data de vencimento, instrumentos/cursos diferentes com margens distintas, e ciclo mensal de receita baseado em mensalidades.

### 1.3 Publico-Alvo

- **Primario:** Diretores e gestores de escolas de musica que participam da mentoria Maestros da Gestao
- **Secundario:** Qualquer escola de musica que precise de controle financeiro especializado

### 1.4 Modelo de Distribuicao

Acesso exclusivo por convite do superadmin (mentor). Nao ha cadastro publico. Cada mentorado recebe um convite por email, aceita, e tem seu tenant provisionado automaticamente.

---

## 2. Arquitetura Tecnica

### 2.1 Stack

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Frontend | React + TypeScript | React 18, TS 5 |
| Build | Vite | 6.4.1 |
| Estilizacao | Tailwind CSS v4 | via @tailwindcss/vite |
| Componentes UI | Radix UI (Dialog, Popover, Select) | Latest |
| Graficos | Recharts | Latest |
| Backend | Supabase (BaaS) | Cloud |
| Banco de dados | PostgreSQL (Supabase) | 15+ |
| Autenticacao | Supabase Auth (PKCE) | v2 |
| Edge Functions | Deno (Supabase Functions) | Latest |
| Storage | Supabase Storage | Bucket: professor-avatars |

### 2.2 Dependencias do Projeto

**Runtime:**
- @supabase/supabase-js — Cliente Supabase
- @radix-ui/react-dialog, react-popover, react-select — Componentes primitivos
- recharts — Graficos (BarChart, LineChart, PieChart)
- date-fns — Manipulacao de datas
- react-day-picker — Seletor de data
- react-easy-crop — Crop de avatar
- papaparse — Parse CSV
- xlsx — Parse XLSX/XLS
- clsx + tailwind-merge — Utilitarios de classes
- lucide-react — Icones
- motion — Animacoes

**Dev:**
- typescript, autoprefixer, tailwindcss, tsx

### 2.3 Variaveis de Ambiente

| Variavel | Uso | Exposicao |
|----------|-----|-----------|
| VITE_SUPABASE_URL | URL do projeto Supabase | Frontend (build) |
| VITE_SUPABASE_ANON_KEY | Chave anonima do Supabase | Frontend (build) |
| SUPABASE_SERVICE_ROLE_KEY | Chave privilegiada (Edge Functions) | Somente servidor |
| SUPABASE_ACCESS_TOKEN | Token da Management API | Somente desenvolvimento |
| SUPABASE_PROJECT_ID | ID do projeto | Somente desenvolvimento |

### 2.4 Estrutura de Pastas

```
src/
  App.tsx                    # Roteamento principal e guards de auth
  main.tsx                   # Entry point (sem StrictMode)
  index.css                  # Theme system (CSS variables + Tailwind)
  types.ts                   # Interfaces TypeScript globais
  context/
    AuthContext.tsx           # Auth, sessao, tenant, escola, superadmin
    DataContext.tsx           # Dados da escola, CRUD, KPIs, estado de pagina
  lib/
    supabase.ts              # Cliente Supabase (PKCE, storage key)
    supabaseData.ts          # Camada de dados (queries, mutations, views)
    utils.ts                 # Helpers: brl, pct, cn, MS, MF, CCN, CCC
    importService.ts         # Pipeline de importacao CSV/XLSX
  pages/
    Login.tsx                # Tela de login
    CreateSchool.tsx         # Criacao de escola
    SchoolSelector.tsx       # Selecao de escola (multi-escola)
    Dashboard.tsx            # KPIs, graficos, inadimplencia
    Professors.tsx           # CRUD professores/alunos, pagamentos
    Financial.tsx            # Receitas, despesas, centros de custo
    Payables.tsx             # Contas a pagar (unica, recorrente, parcelada)
    Dre.tsx                  # DRE anual automatico
    Config.tsx               # Configuracoes da escola + import wizard
    Admin.tsx                # Painel superadmin (mentorados, convites)
  components/
    Header.tsx               # Barra superior (escola, dark mode, sair)
    Sidebar.tsx              # Navegacao lateral colapsavel
    MonthSelector.tsx        # Seletor de mes (Jan-Dez)
    KpiCard.tsx              # Card de indicador
    DelinquencyPanel.tsx     # Painel de inadimplencia
    CourseBreakdown.tsx      # Rentabilidade por curso/instrumento
    ProfessorStatement.tsx   # Extrato do professor (WhatsApp)
    ImportWizard.tsx         # Assistente de importacao
    ui/
      Select.tsx             # Select customizado (Radix)
      DatePicker.tsx         # Seletor de data (Radix + react-day-picker)
      Modal.tsx              # Modal, ConfirmModal, useConfirm
      AvatarUploader.tsx     # Upload de avatar com crop
      index.ts               # Re-exports

supabase/
  functions/
    invite-user/index.ts     # Edge Function: convite de mentorado
    list-mentees/index.ts    # Edge Function: listar mentorados
    manage-mentee/index.ts   # Edge Function: pausar/ativar/excluir mentorado
  migrations/
    20260304221007_remote_schema.sql    # Schema completo
    20260304221700_add_payment_method.sql # Campo payment_method
```

---

## 3. Modelo de Dados

### 3.1 Diagrama Relacional (Resumo)

```
tenants ──< tenant_users >── auth.users
   │                              │
   └──< schools ──< professors    │
          │           │    └──< professor_instruments >── instruments
          │           └──< students ──< payments
          │                  │    └──< student_history
          │                  └── instrument_id FK
          ├──< cost_centers ──< expense_items ──< expenses
          ├──< revenue_categories ──< revenues
          ├──< bills
          └──< import_history

superadmins >── auth.users
invites (invited_by FK auth.users)
```

### 3.2 Tabelas Principais

#### tenants
Cada tenant representa um mentorado (cliente). Criado automaticamente ao aceitar convite.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| name | text NOT NULL | Nome do mentorado |
| email | text NOT NULL UNIQUE | Email do mentorado |
| created_at | timestamptz | Data de criacao |

#### tenant_users
Vincula usuarios autenticados a tenants. Um usuario pode ter apenas um tenant.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| tenant_id | uuid FK tenants | Tenant vinculado |
| user_id | uuid FK auth.users | Usuario autenticado |
| role | text CHECK (owner, admin, viewer) | Papel (default: owner) |
| status | text CHECK (active, paused) | Estado do acesso (default: active) |
| created_at | timestamptz | Data de criacao |

#### schools
Cada tenant pode ter multiplas escolas.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| tenant_id | uuid FK tenants | Tenant proprietario |
| name | text NOT NULL | Nome da escola |
| year | integer NOT NULL | Ano de referencia (default: ano atual) |
| default_tuition | numeric(10,2) | Mensalidade padrao (default: 350) |
| passport_fee | numeric(10,2) | Taxa de matricula (default: 350) |
| created_at | timestamptz | Data de criacao |

**Trigger:** `seed_school_defaults` — ao criar escola, insere automaticamente centros de custo, categorias de receita e instrumentos padrao.

#### professors
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| school_id | uuid FK schools | Escola vinculada |
| name | text NOT NULL | Nome do professor |
| instrument | text | Instrumento principal (legado) |
| cost_per_student | numeric(10,2) | Custo por aluno (folha) |
| active | boolean | Se esta ativo (default: true) |
| avatar_url | text | URL do avatar (Supabase Storage) |
| created_at | timestamptz | Data de criacao |

#### students
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| school_id | uuid FK schools | Escola vinculada |
| professor_id | uuid FK professors | Professor responsavel |
| name | text NOT NULL | Nome do aluno |
| situation | text CHECK (Ativo, Evadido, Trancado) | Situacao (default: Ativo) |
| enrollment_date | date NOT NULL | Data de matricula (default: hoje) |
| exit_date | date | Data de saida (preenchido automaticamente) |
| instrument_id | uuid FK instruments | Instrumento/curso |
| tuition_amount | numeric(10,2) | Valor da mensalidade |
| due_day | integer | Dia de vencimento (default: 5) |
| payment_method | text | Forma de pagamento |
| lesson_day | text | Dia da aula |
| lesson_time | text | Horario da aula |
| person_id | uuid NOT NULL | ID de pessoa (para deduplicacao) |
| phone | text | Telefone |
| responsible_name | text | Nome do responsavel |
| responsible_phone | text | Telefone do responsavel |
| created_at | timestamptz | Data de criacao |

**Trigger:** `log_student_history` — ao mudar `situation`, registra historico e preenche `exit_date` automaticamente.

#### payments
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| student_id | uuid FK students | Aluno |
| school_id | uuid FK schools | Escola |
| year | integer NOT NULL | Ano |
| month | integer NOT NULL (1-12) | Mes |
| amount | numeric(10,2) | Valor pago |
| status | text CHECK (PENDING, PAID, LATE, WAIVED) | Status (default: PENDING) |
| paid_at | timestamptz | Data do pagamento |
| created_at | timestamptz | Data de criacao |
| UNIQUE | (student_id, year, month) | Um pagamento por aluno/mes |

**Trigger:** `check_payment_school_consistency` — valida que school_id do payment corresponde ao school_id do student.

#### cost_centers
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| school_id | uuid FK schools | Escola |
| name | text NOT NULL | Nome (Pessoal, Infraestrutura, Professores, Marketing, Eventos, Admin, Invest, Impostos) |
| color | text | Cor (default: #6b7280) |
| sort_order | integer | Ordem de exibicao |

#### expense_items
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| cost_center_id | uuid FK cost_centers | Centro de custo |
| name | text NOT NULL | Nome (ex: Energia Eletrica, Aluguel) |
| expense_type | text CHECK ('F', 'V') | Fixo ou Variavel (default: V) |

#### expenses
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| expense_item_id | uuid FK expense_items | Item de despesa |
| school_id | uuid FK schools | Escola |
| year | integer NOT NULL | Ano |
| month | integer NOT NULL (1-12) | Mes |
| amount | numeric(10,2) | Valor |
| UNIQUE | (expense_item_id, year, month) | Um lancamento por item/mes |

**Trigger:** `check_expense_school_consistency` — valida consistencia entre school_id.

#### bills (contas a pagar)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| school_id | uuid FK schools | Escola |
| expense_item_id | uuid FK expense_items | Item de despesa vinculado |
| description | text NOT NULL | Descricao (ex: Conta de Luz) |
| bill_type | text CHECK (UNIQUE, RECURRENT_FIXED, RECURRENT_VARIABLE, INSTALLMENT) | Tipo de conta |
| amount | numeric(10,2) NOT NULL | Valor |
| paid_amount | numeric(10,2) | Valor pago |
| due_date | date NOT NULL | Data de vencimento |
| paid_at | date | Data de pagamento |
| total_installments | integer | Total de parcelas (se INSTALLMENT) |
| current_installment | integer | Parcela atual |
| status | text CHECK (PENDING, PAID, CANCELLED) | Status (default: PENDING) |
| group_id | uuid | Agrupador de parcelas/recorrencias |
| competence_month | integer | Mes de competencia |
| competence_year | integer | Ano de competencia |

#### revenue_categories
Categorias de receita por escola (ex: Mensalidades, Matriculas, Eventos).

#### revenues
Lancamentos de receita por escola, categoria, mes/ano.

#### instruments
Instrumentos/cursos da escola (ex: Violao, Piano, Canto). UNIQUE por (school_id, name).

#### professor_instruments
Relacao N:N entre professores e instrumentos.

#### student_history
Historico de mudancas de situacao do aluno (automatico via trigger).

#### import_history
Registro de importacoes CSV/XLSX realizadas. UNIQUE por (school_id, year, month).

#### superadmins
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| user_id | uuid PK FK auth.users | Administrador da plataforma |
| created_at | timestamptz | Data de criacao |

#### invites
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | Identificador |
| email | text NOT NULL | Email do convidado |
| invited_by | uuid FK auth.users | Quem convidou |
| status | text CHECK (pending, accepted, revoked) | Status (default: pending) |
| accepted_at | timestamptz | Quando aceitou |
| created_at | timestamptz | Data de criacao |

### 3.3 Views

| View | Descricao | Dados |
|------|-----------|-------|
| view_monthly_kpis | KPIs mensais consolidados | tuition_revenue, paying_students, active_students, new_enrollments, churned_students, professor_payroll, churn_rate |
| view_breakeven | Ponto de equilibrio | fixed_costs, variable_costs, total_costs, revenue, breakeven |
| view_avg_tenure | Tempo medio de permanencia | avg_tenure_months por escola |
| view_active_students | Contagem de alunos ativos | active_students, total_students por escola |
| view_monthly_revenue | Receita mensal de mensalidades | tuition_revenue, paying_students por escola/mes |
| view_monthly_payroll | Folha de pagamento mensal | professor_payroll por escola/mes |
| view_monthly_churn | Evasoes mensais | churned_students por escola/mes |
| view_new_enrollments | Matriculas novas por mes | new_enrollments por escola/mes |

### 3.4 Functions (PostgreSQL)

| Function | Tipo | Descricao |
|----------|------|-----------|
| create_tenant_for_user(name, email) | SECURITY DEFINER | Cria tenant e vincula ao usuario autenticado |
| reset_school_data(school_id) | SECURITY DEFINER | Reseta todos os dados da escola (com verificacao de tenant) |
| seed_school_defaults | TRIGGER | Insere dados padrao ao criar escola |
| log_student_history | TRIGGER | Registra mudancas de situacao do aluno |
| check_expense_school_consistency | TRIGGER | Valida consistencia de school_id em expenses |
| check_payment_school_consistency | TRIGGER | Valida consistencia de school_id em payments |

### 3.5 RLS (Row Level Security)

Todas as 18 tabelas publicas possuem RLS habilitado com politica `tenant_isolation`:
- Tabelas com `school_id`: verificam se school pertence ao tenant do usuario via `tenant_users`
- Tabelas sem school_id direto (expense_items, professor_instruments, student_history): verificam via JOINs encadeados ate schools/tenant_users
- `superadmins`: somente leitura propria (`user_id = auth.uid()`)
- `invites`: somente superadmins
- `tenant_users`: somente proprio (`user_id = auth.uid()`)

### 3.6 Indexes

Indexes criados para performance em queries frequentes:
- `bills`: due_date, group, school, status
- `payments`: school_year_month, status, student
- `students`: enrollment, professor, school, situation
- `expenses`: item, school_year_month
- `cost_centers`, `expense_items`, `revenue_categories`, `revenues`: school/FK indexes
- `student_history`: changed_at, student

---

## 4. Funcionalidades

### 4.1 Autenticacao e Acesso

**Fluxo de autenticacao:**
1. Login com email/senha (Supabase Auth PKCE)
2. Resolucao de tenant via `tenant_users`
3. Selecao de escola (se multiplas) ou auto-selecao (se unica)
4. Redirecionamento para Dashboard

**Caracteristicas:**
- Sem cadastro publico (somente por convite)
- Storage key customizado (`musicfinance-auth`)
- Limpeza automatica de chaves legadas do Supabase no localStorage
- Logout global com fallback local
- Safety timer de 6s para evitar loading infinito
- Sanitizacao de erros de login (mensagens genericas para seguranca)

### 4.2 Dashboard

**Pagina:** `Dashboard.tsx`

**KPIs Financeiros (Mensal):**
- Receita (mensalidades pagas)
- Receita Prevista (total de mensalidades ativas)
- Despesas (total do mes)
- Resultado (receita - despesas)
- Ticket Medio (receita / alunos pagantes)
- Custo por Aluno (despesas totais / alunos ativos)
- Ponto de Equilibrio (via view_breakeven)

**KPIs de Alunos (Mensal):**
- Alunos Ativos
- Pagantes
- Inadimplentes
- Matriculas (novas)
- Evasoes
- Churn Rate (%)
- Tempo Medio de Permanencia (meses)

**Graficos:**
- Receita x Despesa x Resultado (LineChart, 12 meses)
- Centros de Custo (PieChart)
- Margem Mensal (BarChart)
- Fixos vs Variaveis (PieChart)
- Indicadores Mensais (BarChart combinado)

**Paineis:**
- Painel de Inadimplencia (alunos com pagamento atrasado, expandivel por professor)
- Rentabilidade por Curso/Instrumento (receita, custo, margem, alunos — ordenavel)

### 4.3 Professores e Alunos

**Pagina:** `Professors.tsx`

**Professor — CRUD:**
- Nome, instrumento(s), custo por aluno, avatar
- Ativar/desativar professor
- Upload de avatar com crop (Supabase Storage)
- Multiplos instrumentos via `professor_instruments`

**Aluno — CRUD:**
- Nome, professor, instrumento/curso, situacao
- Mensalidade, dia de vencimento, forma de pagamento
- Data de matricula, dia/horario da aula
- Historico de situacao (automatico via trigger)

**Pagamentos:**
- Pagamento mensal por aluno (PENDING, PAID, LATE, WAIVED)
- Marcacao em massa (selecionar todos e pagar)
- Valor individual por aluno

**Extrato do Professor:**
- Resumo mensal: lista de alunos, valor por aluno, total
- Copia formatada para WhatsApp
- Independe do aluno ter pago ou nao (folha fixa)

### 4.4 Financeiro

**Pagina:** `Financial.tsx`

**Receitas:**
- Categorias de receita (Mensalidades, Matriculas, Eventos, etc.)
- Lancamento mensal por categoria
- CRUD de categorias

**Despesas:**
- Centros de custo (Pessoal, Infraestrutura, Professores, Marketing, Eventos, Admin, Invest, Impostos)
- Itens de despesa por centro de custo
- Classificacao: Fixo (F) ou Variavel (V)
- Lancamento mensal por item

**KPIs:**
- Receita total, despesa total, resultado, margem
- Visualizacao por mes

### 4.5 Contas a Pagar

**Pagina:** `Payables.tsx`

**Tipos de conta:**
- **Unica (UNIQUE):** Lancamento avulso, uma vez
- **Recorrente Fixa (RECURRENT_FIXED):** Valor fixo, repete todo mes (ex: aluguel)
- **Recorrente Variavel (RECURRENT_VARIABLE):** Valor variavel, repete todo mes (ex: energia)
- **Parcelada (INSTALLMENT):** Valor dividido em N parcelas (ex: financiamento)

**Funcionalidades:**
- Criar nova conta (modal completo com todos os campos)
- Editar conta existente (modal de edicao)
- Excluir conta
- Marcar como PENDENTE ou JA PAGO
- Vincular a centro de custo e item de despesa
- Mes de competencia
- Agrupamento por group_id (parcelas/recorrencias)

### 4.6 DRE Anual

**Pagina:** `Dre.tsx`

**Estrutura do DRE:**
1. Receita Bruta (mensalidades + outras receitas)
2. (-) Deducoes (impostos sobre receita)
3. = Receita Liquida
4. (-) Despesas Variaveis (folha de professores + outros variaveis)
5. = Margem de Contribuicao
6. (-) Despesas Fixas
7. = Resultado Operacional (EBITDA)

**Exibicao:**
- Tabela com 12 colunas (Jan-Dez) + Total
- Grafico de barras (Receita vs Despesas por mes)
- Folha de professores classificada como despesa fixa

### 4.7 Configuracoes

**Pagina:** `Config.tsx`

- Nome da escola
- Ano de referencia (com debounce e validacao 2020-2099)
- Mensalidade padrao
- Taxa de matricula
- Assistente de Importacao (CSV/XLSX)

### 4.8 Importacao de Dados

**Componente:** `ImportWizard.tsx` + `importService.ts`

**Pipeline:**
1. Upload (CSV ou XLSX, drag-and-drop)
2. Mapeamento de colunas automatico
3. Normalizacao de dados
4. Snapshot do estado atual
5. Calculo de diff (acoes necessarias)
6. Preview das acoes
7. Execucao com progresso

**Tipos de acao:**
- CREATE_PROFESSOR, UPDATE_PROFESSOR, ADD_PROFESSOR_INSTRUMENT, DEACTIVATE_PROFESSOR
- CREATE_STUDENT, UPDATE_SITUATION, UPDATE_TUITION, UPDATE_COURSE, UPDATE_SCHEDULE, TRANSFER_STUDENT
- CONFIRM_PAYMENT, PENDING_PAYMENT
- POSSIBLE_CHURN (aluno que sumiu da planilha)

**Historico:**
- Registro de cada importacao com contadores (professores criados, alunos criados, etc.)
- Uma importacao por escola/mes

### 4.9 Painel Admin (Superadmin)

**Pagina:** `Admin.tsx`

**Acesso:** Somente usuarios presentes na tabela `superadmins`.

**Funcionalidades:**
- **Convidar mentorado:** Envia email de convite (Supabase GoTrue `/auth/v1/invite`), cria registro em `invites`, pre-provisiona tenant e tenant_users
- **Listar mentorados:** Exibe todos os usuarios com tenant, escola(s), status, datas
- **Pausar acesso:** Muda status para "paused" em `tenant_users`
- **Reativar acesso:** Muda status para "active" em `tenant_users`
- **Excluir mentorado:** Remove tenant_users, tenants, schools, invites e auth.users
- **Revogar convite:** Muda status do invite para "revoked"
- **Historico:** Lista convites aceitos e revogados

**Edge Functions:**
- `invite-user`: POST, valida superadmin, envia convite, pre-provisiona tenant
- `list-mentees`: GET/POST, valida superadmin, retorna lista completa
- `manage-mentee`: POST, valida superadmin, executa pause/activate/delete

---

## 5. Multi-Tenancy e Isolamento

### 5.1 Modelo

```
Superadmin (mentor)
  └── convida mentorados (invites)
        └── cada mentorado = 1 tenant
              └── cada tenant pode ter N schools
                    └── cada school tem seus proprios dados isolados
```

### 5.2 Isolamento de Dados

**Camada 1 — RLS (Banco):**
Todas as tabelas possuem politica `tenant_isolation` que garante que um usuario autenticado so acessa dados do seu proprio tenant. A verificacao passa por `tenant_users → tenants → schools`.

**Camada 2 — Frontend:**
- `AuthContext` resolve o `tenantId` do usuario logado
- Schools sao filtradas explicitamente por `tenant_id`
- `DataContext` usa `selectedSchool.id` (school_id) em todas as queries
- Sidebar e paginas so exibem dados da escola selecionada

**Camada 3 — Edge Functions:**
- Validacao de JWT em cada funcao
- Verificacao de superadmin via tabela `superadmins`
- Service role key usada apenas para operacoes administrativas

---

## 6. Seguranca

### 6.1 Autenticacao
- PKCE flow (mais seguro que implicit)
- Storage key customizado para evitar conflitos
- Limpeza de chaves legadas no startup
- Timeout de sessao via Supabase auto-refresh

### 6.2 Autorizacao
- RLS em todas as tabelas (18/18)
- Superadmin verificado em 3 camadas (sidebar, rota, componente)
- Edge Functions com JWT validation manual + service_role para operacoes admin
- Trigger de consistencia (school_id) em payments e expenses

### 6.3 Protecoes
- Cadastro publico desabilitado no Supabase
- Erros de login sanitizados (sem expor detalhes)
- `.env` com secrets no `.gitignore`
- CORS configurado nas Edge Functions
- Functions com `verify_jwt: false` (validacao interna para controle fino)

---

## 7. UI/UX

### 7.1 Design System

**Tema:** Dark mode por padrao, com toggle para light mode.

**Cores (Dark):**
- Background: #0a0a0a (primary), #111111 (secondary), #1a1a1a (tertiary)
- Texto: #f5f5f5 (primary), #a3a3a3 (secondary), #666666 (tertiary)
- Acentos: green (#22c55e), red (#ef4444), amber (#f59e0b), blue (#3b82f6), cyan (#06b6d4)
- Botao primario: fundo preto, texto branco

**Fontes:**
- DM Sans (UI geral)
- JetBrains Mono (numeros, monospace)
- Bricolage Grotesque (logo)

**Componentes:**
- Cards com bordas arredondadas e sombra suave
- Tabelas com hover e separadores sutis
- Modais centralizados com overlay
- Selects customizados (Radix) com badges de cor
- DatePicker localizado (pt-BR)
- MonthSelector horizontal (Jan-Dez)

### 7.2 Responsividade
- Layout com sidebar colapsavel
- Tabelas com scroll horizontal quando necessario
- Fontes e espacamentos adaptaveis

### 7.3 Navegacao
- Sidebar fixa a esquerda com icones e labels
- Navegacao por estado (`page`) sem React Router
- Code splitting com `React.lazy()` e `Suspense`
- Loading screen ("MF" + spinner) durante carregamento

### 7.4 Feedback ao Usuario
- Save status no header (salvando/salvo/erro)
- Feedback de sucesso/erro em acoes do Admin
- Tooltips e subtext nos KPIs
- Confirmacao antes de exclusoes

---

## 8. Performance

### 8.1 Otimizacoes Implementadas

- **Code splitting:** Todas as paginas carregadas com `React.lazy()`
- **Queries paralelas:** `Promise.allSettled` para queries independentes no auth
- **Single-load guard:** Refs para evitar chamadas duplicadas
- **Safety timer:** Timeout de 6s para evitar loading infinito
- **Indexes no banco:** 16+ indexes nas tabelas mais consultadas
- **Views consolidadas:** KPIs calculados via views SQL (nao no frontend)

### 8.2 Bundle Size (Build)

| Chunk | Tamanho | Gzip |
|-------|---------|------|
| index (core) | 446 KB | 130 KB |
| Config | 477 KB | 158 KB |
| BarChart (Recharts) | 355 KB | 106 KB |
| DatePicker | 108 KB | 29 KB |
| Professors | 73 KB | 19 KB |
| Dashboard | 60 KB | 16 KB |
| Select | 50 KB | 18 KB |
| CSS | 46 KB | 8 KB |

---

## 9. Fluxos Principais

### 9.1 Primeiro Acesso (Mentorado)

```
Superadmin envia convite → Email com link "Aceitar Convite"
  → Mentorado clica → Supabase cria auth.users
  → invite-user ja pre-provisionou tenant + tenant_users
  → Mentorado define senha → Login
  → Sem escola → Tela "Crie sua primeira escola"
  → Preenche nome, mensalidade, taxa, ano → Criar
  → Trigger seed_school_defaults insere dados padrao
  → Redirecionado para Dashboard vazio
```

### 9.2 Operacao Mensal Tipica

```
1. Acessar Dashboard → Ver KPIs do mes
2. Professores → Cadastrar/atualizar professores e alunos
3. Professores → Marcar pagamentos do mes (em massa ou individual)
4. Financeiro → Lancar receitas e despesas do mes
5. Contas a Pagar → Verificar e pagar contas pendentes
6. DRE → Analisar resultado acumulado
7. Dashboard → Gerar extrato do professor para WhatsApp
```

### 9.3 Importacao de Dados

```
1. Config → Import Wizard → Upload planilha
2. Sistema mapeia colunas automaticamente
3. Preview: lista de acoes (criar professor, criar aluno, etc.)
4. Confirmar → Execucao com barra de progresso
5. Resultado: resumo com contadores
```

---

## 10. Limitacoes Conhecidas e Divida Tecnica

### 10.1 Bugs Conhecidos
- `CreateSchool.tsx`: classe CSS `max-md` deveria ser `max-w-md`
- `Dre.tsx`: varItems renderiza mesmo valor para todas as linhas (bug de referencia)
- `KpiCard.tsx`: props `icon` e `color` nao sao utilizadas no render

### 10.2 Divida Tecnica
- Sem React Router (navegacao por estado simples)
- `DataProvider` retorna `null` durante loading (sem spinner de dados)
- Sem testes automatizados (unit, integration, E2E)
- Sem CI/CD pipeline
- Import wizard sem undo/rollback
- Sem paginacao em tabelas grandes
- Sem notificacoes push/email para inadimplencia
- Campos de contato do aluno (phone, responsible) comentados no frontend

### 10.3 Melhorias Futuras Sugeridas
- React Router para URLs navegaveis e deep linking
- Testes com Vitest + Testing Library
- CI/CD com deploy automatico
- Notificacoes de inadimplencia (email/WhatsApp)
- Dashboard comparativo (mes anterior, ano anterior)
- Exportacao PDF do DRE e extratos
- Modulo de contratos/matriculas digitais
- Integracao com meios de pagamento (PIX, boleto)
- App mobile (React Native)
- Auditoria/log de acoes do usuario

---

## 11. Glossario

| Termo | Definicao |
|-------|-----------|
| Tenant | Unidade de isolamento; cada mentorado e um tenant |
| Mentorado | Cliente da mentoria Maestros da Gestao |
| Superadmin | Administrador da plataforma (mentor) |
| School | Escola de musica dentro de um tenant |
| Professor | Instrutor vinculado a uma escola |
| Aluno | Estudante vinculado a um professor |
| Churn | Evasao de alunos |
| Ticket Medio | Receita / numero de alunos pagantes |
| Ponto de Equilibrio | Receita necessaria para cobrir custos fixos e variaveis |
| DRE | Demonstrativo de Resultado do Exercicio |
| EBITDA | Resultado operacional antes de juros, impostos, depreciacao e amortizacao |
| RLS | Row Level Security — isolamento de dados no banco |
| PKCE | Proof Key for Code Exchange — fluxo de autenticacao seguro |
| Edge Function | Funcao serverless executada no Supabase (Deno) |
| Custo por Aluno | Despesas totais / total de alunos ativos |
| Folha de Professores | Soma de cost_per_student x alunos pagantes por professor |

---

*Documento gerado a partir de auditoria completa do codigo-fonte, banco de dados e Edge Functions do MusicFinance em 06/03/2026.*
