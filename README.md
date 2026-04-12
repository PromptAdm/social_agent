# Social Agent — Backend

Backend Python/FastAPI para automação de conteúdo e gestão de redes sociais.

## Conceito

```
Geração → Aprovação → Agendamento → Publicação → Engajamento → Leads → Analytics
```

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Web Framework | FastAPI |
| ORM | SQLAlchemy 2.0 |
| Migrações | Alembic |
| Banco de Dados | PostgreSQL |
| Autenticação | JWT (python-jose + passlib/bcrypt) |
| Validação | Pydantic v2 |

## Estrutura de Pastas

```
social_agent/
├── app/
│   ├── main.py                  # Ponto de entrada FastAPI
│   ├── core/
│   │   ├── config.py            # Settings via pydantic-settings
│   │   ├── database.py          # Engine, SessionLocal, Base
│   │   ├── security.py          # JWT e hashing
│   │   └── dependencies.py      # Depends reutilizáveis (get_db, get_current_user)
│   ├── models/                  # Models SQLAlchemy (ORM)
│   │   ├── user.py
│   │   ├── brand.py
│   │   ├── content_pillar.py
│   │   ├── idea.py              # + prioridade, formato_sugerido
│   │   ├── post.py              # + formato, cta, prioridade
│   │   ├── media_asset.py
│   │   ├── comment.py           # + classificacao
│   │   ├── reply_suggestion.py
│   │   ├── lead.py
│   │   └── analytics_snapshot.py
│   ├── schemas/                 # Schemas Pydantic (validação I/O)
│   │   └── (11 arquivos — espelham os models)
│   ├── routers/                 # Endpoints FastAPI por módulo
│   │   ├── auth.py              # Registro e login
│   │   ├── users.py             # Perfil do usuário
│   │   ├── brands.py            # Módulo 1: Estratégia da Marca
│   │   ├── content_pillars.py   # Módulo 1: Pilares Editoriais
│   │   ├── ideas.py             # Módulo 2: Ideias
│   │   ├── posts.py             # Módulo 3: Posts
│   │   ├── approval.py          # Módulo 4: Aprovação
│   │   ├── publishing.py        # Módulo 5: Agendamento e Publicação
│   │   ├── engagement.py        # Módulo 6: Engajamento
│   │   ├── leads.py             # Módulo 7: Leads
│   │   └── analytics.py         # Módulo 8: Analytics
│   └── services/                # Lógica de negócio por módulo
│       └── (11 arquivos)
├── alembic/
│   ├── env.py                   # Lê DATABASE_URL do .env automaticamente
│   ├── script.py.mako
│   └── versions/
│       └── 0001_initial_schema.py  # Migração inicial (todas as tabelas)
├── scripts/
│   ├── seed.py                  # Seed de dados fictícios (VitaForma)
│   └── db_setup.py              # Helper: migrar + seed + reset
├── alembic.ini
├── requirements.txt
├── .env.example
└── README.md
```

## Entidades e Relacionamentos

```
User
 └── Brand (owner_id)
      ├── ContentPillar (brand_id)
      ├── Idea (brand_id, pillar_id?)  ──generates──▶  Post
      ├── Post (brand_id, pillar_id?, idea_id?)
      │    ├── MediaAsset (post_id)    [carrossel, video, etc.]
      │    └── Comment (post_id)
      │         └── ReplySuggestion (comment_id)
      ├── Lead (brand_id)
      └── AnalyticsSnapshot (brand_id)
```

## Fluxos de Status

```
Idea:    ideia ──▶ rascunho ──▶ arquivado
Post:    rascunho ──▶ aprovado ──▶ agendado ──▶ publicado ──▶ arquivado
Reply:   pendente ──▶ aprovado / rejeitado ──▶ publicado
Lead:    novo ──▶ contatado ──▶ qualificado ──▶ convertido / perdido
```

## Campos-chave adicionados nesta fase

| Entidade | Campos novos |
|----------|-------------|
| Post | `formato` (carrossel/reels/stories…), `cta`, `prioridade` (baixa→urgente) |
| Idea | `prioridade`, `formato_sugerido` |
| Comment | `classificacao` (elogio/crítica/dúvida/lead_potencial/spam…) |

---

## Como Executar

### 1. Pré-requisitos

- Python 3.12+
- PostgreSQL rodando localmente (ou via Docker — veja abaixo)

### 2. Ambiente virtual e dependências

```bash
python -m venv .venv

# Linux/Mac
source .venv/bin/activate
# Windows
.venv\Scripts\activate

pip install -r requirements.txt
```

### 3. Variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com seus dados reais
```

Campos obrigatórios no `.env`:

```env
DATABASE_URL=postgresql+psycopg2://user:senha@localhost:5432/social_agent
SECRET_KEY=<gere com o comando abaixo>
```

Gerar `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. PostgreSQL via Docker (opcional)

```bash
docker run -d \
  --name social_agent_db \
  -e POSTGRES_USER=social_agent \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=social_agent \
  -p 5432:5432 \
  postgres:16-alpine
```

### 5. Setup do banco de dados

#### Opção A — script automático (recomendado)

```bash
# Somente migrar
python scripts/db_setup.py

# Migrar + popular com dados fictícios
python scripts/db_setup.py --seed

# Reset completo ⚠️ APAGA TODOS OS DADOS
python scripts/db_setup.py --reset --seed
```

#### Opção B — manual

```bash
# Cria o banco (se não usou Docker)
psql -U postgres -c "CREATE DATABASE social_agent;"

# Executa as migrações
alembic upgrade head

# (opcional) Popula com seed
python -m scripts.seed
```

### 6. Iniciar o servidor

```bash
uvicorn app.main:app --reload
```

| URL | Descrição |
|-----|-----------|
| http://localhost:8000/docs | Swagger UI interativo |
| http://localhost:8000/redoc | Documentação ReDoc |
| http://localhost:8000/health | Health check |

---

## Autenticação

A API usa **JWT Bearer Token**:

1. `POST /api/v1/auth/register` — cria conta
2. `POST /api/v1/auth/token` — obtém token (form: `username` + `password`)
3. Inclua no header: `Authorization: Bearer <token>`

**Usuário do seed:**
```
Email: admin@vitaforma.com.br
Senha: admin123
```

---

## Seed de Dados (VitaForma)

O seed cria um cenário realista com a marca fictícia **VitaForma** (suplementos fitness):

| Tabela | Qtd | Detalhe |
|--------|-----|---------|
| Users | 1 | admin@vitaforma.com.br |
| Brands | 1 | VitaForma |
| ContentPillars | 4 | Educação, Motivação, Produto, Comunidade |
| Ideas | 5 | Status variados, prioridades diferentes |
| Posts | 5 | 1 publicado, 1 agendado, 1 aprovado, 1 rascunho, 1 arquivado |
| MediaAssets | 4 | 3 imagens (carrossel) + 1 vídeo (reels) |
| Comments | 6 | Elogio, dúvida, lead, crítica, spam, sugestão |
| ReplySuggestions | 4 | 1 publicada, 1 aprovada, 2 pendentes (IA) |
| Leads | 4 | Novo, contatado, qualificado, convertido |
| AnalyticsSnapshots | 3 | Instagram (×2) + LinkedIn |

---

## Migrações

```bash
# Aplicar migrações pendentes
alembic upgrade head

# Criar nova migração após alterar models
alembic revision --autogenerate -m "descricao_da_alteracao"

# Ver histórico
alembic history

# Reverter última migração
alembic downgrade -1

# Reverter tudo
alembic downgrade base
```
