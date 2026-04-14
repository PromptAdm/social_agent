# Graph Report - .  (2026-04-13)

## Corpus Check
- 138 files · ~152,587 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 782 nodes · 2090 edges · 82 communities detected
- Extraction: 41% EXTRACTED · 59% INFERRED · 0% AMBIGUOUS · INFERRED: 1229 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]

## God Nodes (most connected - your core abstractions)
1. `CommentClassificacao` - 63 edges
2. `CommentSentiment` - 59 edges
3. `SocialPlatform` - 58 edges
4. `PostStatus` - 56 edges
5. `User` - 56 edges
6. `Base` - 49 edges
7. `IdeaFormatoSugerido` - 43 edges
8. `PostFormato` - 37 edges
9. `PublishPostData` - 34 edges
10. `PostPrioridade` - 34 edges

## Surprising Connections (you probably didn't know these)
- `Base` --uses--> `Model: IntegrationLog Registro auditável de cada tentativa de integração com sis`  [INFERRED]
  app\core\database.py → app\models\integration_log.py
- `Base` --uses--> `Formato visual/editorial do post na plataforma.`  [INFERRED]
  app\core\database.py → app\models\post.py
- `Base` --uses--> `Prioridade editorial do post na fila de publicação.`  [INFERRED]
  app\core\database.py → app\models\post.py
- `Alembic env.py — configuração de migrações do Social Agent.  Comportamento: - Lê` --uses--> `Base`  [INFERRED]
  alembic\env.py → app\core\database.py
- `Executa migrações em modo offline (sem conexão ativa ao banco).     Gera SQL pur` --uses--> `Base`  [INFERRED]
  alembic\env.py → app\core\database.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (74): change_password(), login(), login_oauth2(), me(), Router: Auth Prefixo: /api/v1/auth  Rotas implementadas:     POST /auth/register, Renova o par de tokens usando um `refresh_token` válido.      O cliente deve cha, Retorna os dados do usuário autenticado pelo token.      Requer header: `Authori, Atualiza `full_name` e/ou `password` do usuário autenticado.     Campos não envi (+66 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (54): ABC, IntegrationError, N8nWebhookClient, Contrato para publishers de redes sociais.      Implementações disponíveis:, Publica um post na plataforma social.          Deve lançar RetryableIntegrationE, Remove um post publicado via ID externo., Retorna métricas do post (impressões, alcance, engajamento)., Contrato para clientes de webhook n8n.      Responsável por disparar workflows n (+46 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (52): Router: AI — Camada de Inteligência Artificial Prefixo: /api/v1/ai  Endpoints:, Service: AI — Camada de Orquestração da Inteligência Artificial  Responsabilidad, Gera ideias de conteúdo enriquecidas usando IA.      As ideias retornadas NÃO sã, Transforma uma ideia existente em post completo via IA.      Herda contexto da i, Analisa um comentário via IA: categoria, urgência, sentimento e resposta sugerid, Gera resposta personalizada para um comentário via IA.      Usa a classificação, Gera relatório semanal consolidado da brand via IA.      Coleta métricas dos últ, Retorna o provedor de IA configurado via AI_PROVIDER no .env.      Valores supor (+44 more)

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (47): approve_reply(), Router: Approval — Módulo 4: Aprovação de Conteúdo Endpoints para aprovar/rejeit, Aprova uma sugestão de resposta., Rejeita uma sugestão de resposta., reject_reply(), BaseModel, EngagementStats, LeadStats (+39 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (39): Enum, LeadBase, LeadCreate, LeadOut, LeadSource, LeadStatus, LeadUpdate, Schemas Pydantic: Lead (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (30): AnalyticsSnapshot, Base, ContentPillar, ContentPillarBase, ContentPillarCreate, ContentPillarOut, ContentPillarUpdate, Schemas Pydantic: ContentPillar (+22 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (37): Polaridade emocional do comentário (análise de sentimento)., Classificação de intenção/tipo do comentário.     Guia a priorização e o tipo de, Base, Configuração do SQLAlchemy: engine, SessionLocal e Base declarativa. Todos os mo, Base declarativa compartilhada por todos os models ORM., DeclarativeBase, Alembic env.py — configuração de migrações do Social Agent.  Comportamento: - Lê, Executa migrações em modo offline (sem conexão ativa ao banco).     Gera SQL pur (+29 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (30): IntegrationLog, IntegrationStatus, Model: IntegrationLog Registro auditável de cada tentativa de integração com sis, get_integration_stats(), list_logs(), Service: Integration Log  Leitura e escrita de logs de integração. Usado por pub, Persiste um registro de integração no banco., Lista logs de integração de uma brand, do mais recente ao mais antigo. (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (24): Service: Approval — Módulo 4: Aprovação de Conteúdo Transições de status para po, CommentBase, CommentClassifyRequest, CommentCreate, CommentOut, CommentUpdate, Router: Engagement — Módulo 6: Gestão de Engajamento Prefixo: /api/v1/engagement, auto_classify_comment() (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (17): BrandBase, BrandConfigOut, BrandConfigUpdate, BrandCreate, BrandOut, BrandUpdate, Schemas Pydantic: Brand, Campos de configuração editorial da brand.     Todos opcionais — somente os camp (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (17): create_snapshot(), get_summary(), list_snapshots(), Router: Analytics — Módulo 8: Analytics e Relatórios Endpoints para criação e co, Registra um snapshot manual de métricas., Lista snapshots de uma brand, opcionalmente filtrado por plataforma., Retorna um resumo consolidado das métricas mais recentes da brand., _assert_brand_ownership() (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (16): BaseSettings, Config, get_settings(), Configurações centrais do Social Agent carregadas via variáveis de ambiente. Uti, Retorna instância singleton das configurações (cache após primeira chamada)., Settings, check_connection(), main() (+8 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (5): cn(), handleBrandChange(), navigate(), onKeyDown(), patch()

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (5): approve_post(), get_post(), publish_post(), reject_post(), schedule_post()

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 0.2
Nodes (9): health_check(), Social Agent — Ponto de entrada da aplicação FastAPI. Registra todos os routers, Verifica se a API está no ar., Normaliza erros de validação Pydantic (422).      Pydantic v2 prefixa mensagens, Captura erros de banco de dados não tratados e retorna 500 limpo., Captura qualquer exceção não tratada e retorna 500 sem expor detalhes internos., sqlalchemy_exception_handler(), unhandled_exception_handler() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.2
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 0.64
Nodes (8): analyze_comment(), _build_brand_context(), generate_ideas(), generate_reply(), generate_weekly_report(), get_ai_provider(), _get_brand(), idea_to_post()

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 0.46
Nodes (7): _assert_brand_ownership(), create_post(), delete_post(), duplicate_post(), get_post(), list_posts(), update_post()

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (4): _create_enum(), initial_schema  Cria todas as tabelas do Social Agent do zero.  Revision ID: 000, Cria um tipo ENUM nativo PostgreSQL, reutilizável nas colunas., upgrade()

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (1): Router: ContentPillars — Módulo 1: Estratégia da Marca (pilares editoriais)

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (1): Skeleton()

### Community 28 - "Community 28"
Cohesion: 0.5
Nodes (1): user_role_and_last_login  Adiciona ao model User:     - role        : papel do u

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (1): brand_config_fields  Adiciona ao model Brand:     - posting_frequency : frequênc

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (1): integration_log_table  Cria a tabela integration_logs para auditoria de todas as

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (1): formatDate()

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (1): POST()

### Community 34 - "Community 34"
Cohesion: 0.5
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): Prompts: Análise e Resposta de Comentários  Placeholders (analyze):     {body}

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Prompts: Geração de Ideias de Conteúdo  Placeholders:     {niche}         — nich

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): Prompts: Transformação de Ideia em Post  Placeholders:     {brand_name}    — nom

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): Prompts: Relatório Semanal  Placeholders:     {brand_name}        — nome da marc

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **42 isolated node(s):** `initial_schema  Cria todas as tabelas do Social Agent do zero.  Revision ID: 000`, `Cria um tipo ENUM nativo PostgreSQL, reutilizável nas colunas.`, `user_role_and_last_login  Adiciona ao model User:     - role        : papel do u`, `brand_config_fields  Adiciona ao model Brand:     - posting_frequency : frequênc`, `integration_log_table  Cria a tabela integration_logs para auditoria de todas as` (+37 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 36`** (2 nodes): `comment_prompts.py`, `Prompts: Análise e Resposta de Comentários  Placeholders (analyze):     {body}`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `idea_prompts.py`, `Prompts: Geração de Ideias de Conteúdo  Placeholders:     {niche}         — nich`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `post_prompts.py`, `Prompts: Transformação de Ideia em Post  Placeholders:     {brand_name}    — nom`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `report_prompts.py`, `Prompts: Relatório Semanal  Placeholders:     {brand_name}        — nome da marc`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `middleware()`, `middleware.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `RootLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `Home()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `AuthLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `handleSubmit()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `DashboardLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `handleRefresh()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `formatPublishedDate()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `SettingsPage()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `getPageMeta()`, `Topbar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `QueryProvider()`, `QueryProvider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `SessionProvider()`, `SessionProvider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `cn()`, `KpiCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `StatusBadge()`, `StatusBadge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `parseApiError()`, `errors.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `cn()`, `cn.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `tailwind.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `EmptyState.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `PageHeader.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `Toaster.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `endpoints.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `queryClient.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `data.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `analyticsService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `brandService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `ideaService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `panelService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `postService.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `authStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `brandStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `uiStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `Base` connect `Community 6` to `Community 0`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `PostStatus` connect `Community 3` to `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 60 inferred relationships involving `CommentClassificacao` (e.g. with `AIIdeaGenerateRequest` and `AIPostFromIdeaRequest`) actually correct?**
  _`CommentClassificacao` has 60 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `CommentSentiment` (e.g. with `AIIdeaGenerateRequest` and `AIPostFromIdeaRequest`) actually correct?**
  _`CommentSentiment` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `SocialPlatform` (e.g. with `AIIdeaGenerateRequest` and `AIPostFromIdeaRequest`) actually correct?**
  _`SocialPlatform` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 54 inferred relationships involving `PostStatus` (e.g. with `Service: AI — Camada de Orquestração da Inteligência Artificial  Responsabilidad` and `Retorna o provedor de IA configurado via AI_PROVIDER no .env.      Valores supor`) actually correct?**
  _`PostStatus` has 54 INFERRED edges - model-reasoned connections that need verification._