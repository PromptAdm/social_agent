"""
Seed de dados fictícios — Social Agent
======================================
Popula o banco com um cenário realista de uma marca de bem-estar/fitness
chamada "VitaForma", com pilares, ideias, posts em vários status,
mídias, comentários, sugestões de resposta, leads e snapshots de analytics.

Uso:
    python -m scripts.seed
    # ou
    python scripts/seed.py
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Garante que o diretório raiz do projeto esteja no sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv()

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.analytics_snapshot import AnalyticsSnapshot
from app.models.brand import Brand
from app.models.comment import Comment, CommentClassificacao, CommentSentiment
from app.models.content_pillar import ContentPillar
from app.models.idea import Idea, IdeaFormatoSugerido, IdeaPrioridade, IdeaStatus
from app.models.lead import Lead, LeadSource, LeadStatus
from app.models.media_asset import AssetType, MediaAsset
from app.models.post import Post, PostFormato, PostPrioridade, PostStatus, SocialPlatform
from app.models.reply_suggestion import ReplySuggestion, SuggestionStatus
from app.models.user import User, UserRole


# ── Helpers ───────────────────────────────────────────────────────────────────

def now() -> datetime:
    return datetime.now(timezone.utc)


def days_ago(n: int) -> datetime:
    return now() - timedelta(days=n)


def days_from_now(n: int) -> datetime:
    return now() + timedelta(days=n)


# ── Seed ──────────────────────────────────────────────────────────────────────

def seed() -> None:
    db = SessionLocal()
    try:
        print("🌱  Iniciando seed do Social Agent…")

        # ── 1. Usuário administrador ──────────────────────────────────────────
        admin = User(
            email="admin@vitaforma.com.br",
            hashed_password=hash_password("Vitaforma1"),  # ≥8 chars, maiúsc, minúsc, número
            full_name="Ana Carolina Mendes",
            role=UserRole.ADMIN,
            is_active=True,
            is_superuser=True,
        )
        db.add(admin)
        db.flush()  # obtém admin.id antes de criar a brand
        print(f"  ✓ Usuário criado: {admin.email}")

        # ── 2. Brand ──────────────────────────────────────────────────────────
        brand = Brand(
            owner_id=admin.id,
            name="VitaForma",
            niche="Bem-estar e Fitness",
            description=(
                "VitaForma é uma marca de suplementos e programas de treino voltada "
                "para mulheres acima de 30 anos que buscam saúde e qualidade de vida."
            ),
            tone_of_voice="Acolhedor, motivador, científico sem ser chato, próximo.",
            target_audience=(
                "Mulheres entre 30 e 55 anos, ativas ou em retomada de atividade física, "
                "interessadas em nutrição, saúde hormonal e bem-estar integral."
            ),
            logo_url="https://cdn.vitaforma.com.br/logo.png",
        )
        db.add(brand)
        db.flush()
        print(f"  ✓ Brand criada: {brand.name}")

        # ── 3. Pilares de conteúdo ────────────────────────────────────────────
        pillar_educacao = ContentPillar(
            brand_id=brand.id,
            name="Educação",
            description="Conteúdo científico sobre nutrição, treino e saúde hormonal.",
            color_hex="#4CAF50",
        )
        pillar_motivacao = ContentPillar(
            brand_id=brand.id,
            name="Motivação",
            description="Histórias de transformação, frases e bastidores da marca.",
            color_hex="#FF9800",
        )
        pillar_produto = ContentPillar(
            brand_id=brand.id,
            name="Produto",
            description="Apresentação e benefícios dos suplementos VitaForma.",
            color_hex="#9C27B0",
        )
        pillar_comunidade = ContentPillar(
            brand_id=brand.id,
            name="Comunidade",
            description="UGC, repostagens de clientes e interação com a audiência.",
            color_hex="#2196F3",
        )
        db.add_all([pillar_educacao, pillar_motivacao, pillar_produto, pillar_comunidade])
        db.flush()
        print(f"  ✓ {4} pilares de conteúdo criados")

        # ── 4. Ideias ─────────────────────────────────────────────────────────
        idea1 = Idea(
            brand_id=brand.id,
            pillar_id=pillar_educacao.id,
            title="5 sinais de que seu corpo precisa de mais proteína",
            description=(
                "Carrossel explicando os principais sinais físicos e cognitivos de "
                "deficiência proteica, com CTA para o Whey VitaForma."
            ),
            source="manual",
            status=IdeaStatus.DRAFT,
            prioridade=IdeaPrioridade.ALTA,
            formato_sugerido=IdeaFormatoSugerido.CARROSSEL,
        )
        idea2 = Idea(
            brand_id=brand.id,
            pillar_id=pillar_motivacao.id,
            title="Transformação da cliente Juliana — 3 meses de VitaForma",
            description=(
                "Reels curto mostrando o antes/depois e depoimento em voz da Juliana. "
                "Pedir autorização de uso de imagem."
            ),
            source="manual",
            status=IdeaStatus.IDEA,
            prioridade=IdeaPrioridade.ALTA,
            formato_sugerido=IdeaFormatoSugerido.REELS,
        )
        idea3 = Idea(
            brand_id=brand.id,
            pillar_id=pillar_produto.id,
            title="Lançamento: Colágeno Verisol + Vitamina C",
            description=(
                "Stories com contagem regressiva + post de lançamento. "
                "Destacar diferenciais: palatabilidade e combinação sinérgica."
            ),
            source="ai_generated",
            status=IdeaStatus.DRAFT,
            prioridade=IdeaPrioridade.ALTA,
            formato_sugerido=IdeaFormatoSugerido.STORIES,
        )
        idea4 = Idea(
            brand_id=brand.id,
            pillar_id=pillar_educacao.id,
            title="Guia rápido: diferença entre whey concentrado, isolado e hidrolisado",
            description="Infográfico em carrossel com linguagem acessível.",
            source="manual",
            status=IdeaStatus.IDEA,
            prioridade=IdeaPrioridade.MEDIA,
            formato_sugerido=IdeaFormatoSugerido.CARROSSEL,
        )
        idea5 = Idea(
            brand_id=brand.id,
            pillar_id=pillar_comunidade.id,
            title="Enquete: qual é o maior desafio da sua rotina fit?",
            description="Stories de enquete para gerar engajamento e coletar dados de audiência.",
            source="manual",
            status=IdeaStatus.IDEA,
            prioridade=IdeaPrioridade.BAIXA,
            formato_sugerido=IdeaFormatoSugerido.STORIES,
        )
        db.add_all([idea1, idea2, idea3, idea4, idea5])
        db.flush()
        print(f"  ✓ {5} ideias criadas")

        # ── 5. Posts ──────────────────────────────────────────────────────────

        # Post 1 — publicado (Instagram, carrossel)
        post_publicado = Post(
            brand_id=brand.id,
            pillar_id=pillar_educacao.id,
            idea_id=idea1.id,
            caption=(
                "Você sabia que a maioria das mulheres consome menos da metade da proteína "
                "que precisa por dia? 😱\n\n"
                "Aqui estão 5 sinais que seu corpo manda quando está pedindo mais proteína:\n\n"
                "➡️ Arrasta o carrossel para ver todos!"
            ),
            hashtags=(
                "#nutrição #proteína #saúdefeminina #vitaforma #fitness "
                "#bemestarnafeminina #suplementos #saudavel"
            ),
            cta="Arrasta pra ver ➡️ | Comentem: qual sinal vocês já sentiram?",
            platform=SocialPlatform.INSTAGRAM,
            formato=PostFormato.CARROSSEL,
            prioridade=PostPrioridade.ALTA,
            status=PostStatus.PUBLISHED,
            approved_by_id=admin.id,
            approved_at=days_ago(10),
            scheduled_at=days_ago(8),
            published_at=days_ago(8),
            external_post_id="IG_17841234567890123",
        )

        # Post 2 — agendado (Instagram, reels)
        post_agendado = Post(
            brand_id=brand.id,
            pillar_id=pillar_motivacao.id,
            idea_id=idea2.id,
            caption=(
                "A Juliana chegou aqui achando que nunca conseguiria. "
                "3 meses depois, ela mesma não se reconhece — e o melhor: "
                "está mais forte, com energia e dormindo melhor! 💪✨\n\n"
                "Essa é a transformação que a VitaForma proporciona."
            ),
            hashtags=(
                "#transformação #vitaforma #resultados #fitness "
                "#mulheresfit #saudavel #proteina"
            ),
            cta="Conta pra gente nos comentários: qual é o seu objetivo hoje? 👇",
            platform=SocialPlatform.INSTAGRAM,
            formato=PostFormato.REELS,
            prioridade=PostPrioridade.ALTA,
            status=PostStatus.SCHEDULED,
            approved_by_id=admin.id,
            approved_at=days_ago(2),
            scheduled_at=days_from_now(3),
        )

        # Post 3 — aprovado aguardando agendamento (LinkedIn)
        post_aprovado = Post(
            brand_id=brand.id,
            pillar_id=pillar_educacao.id,
            idea_id=idea4.id,
            caption=(
                "Você escolhe o whey certo para o seu objetivo?\n\n"
                "Concentrado, isolado ou hidrolisado — cada um tem um papel específico "
                "na sua rotina de treino e recuperação.\n\n"
                "Criamos um guia visual para simplificar essa escolha. 👇"
            ),
            hashtags=(
                "#nutriçãoesportiva #wheyprotein #suplementação #fitness "
                "#saúde #vitaforma #performance"
            ),
            cta="Salva esse post para não esquecer! ⭐",
            platform=SocialPlatform.LINKEDIN,
            formato=PostFormato.CARROSSEL,
            prioridade=PostPrioridade.MEDIA,
            status=PostStatus.APPROVED,
            approved_by_id=admin.id,
            approved_at=days_ago(1),
        )

        # Post 4 — rascunho (Instagram, stories)
        post_rascunho = Post(
            brand_id=brand.id,
            pillar_id=pillar_produto.id,
            idea_id=idea3.id,
            caption=(
                "🚨 NOVIDADE chegando!\n\n"
                "Nossa fórmula mais poderosa até hoje está quase pronta.\n"
                "Colágeno Verisol® + Vitamina C = pele, articulações e imunidade.\n\n"
                "Fica de olho nos próximos dias! 👀"
            ),
            hashtags="#vitaforma #colageno #novidade #lancamento #verisol",
            cta="Ativa o sininho para não perder! 🔔",
            platform=SocialPlatform.INSTAGRAM,
            formato=PostFormato.STORIES,
            prioridade=PostPrioridade.URGENTE,
            status=PostStatus.DRAFT,
        )

        # Post 5 — arquivado
        post_arquivado = Post(
            brand_id=brand.id,
            pillar_id=pillar_comunidade.id,
            caption="Black Friday VitaForma — 40% OFF em toda a linha! Só hoje!",
            hashtags="#blackfriday #vitaforma #desconto #oferta",
            cta="Corre para o link na bio! 🏃‍♀️",
            platform=SocialPlatform.INSTAGRAM,
            formato=PostFormato.IMAGEM_UNICA,
            prioridade=PostPrioridade.URGENTE,
            status=PostStatus.ARCHIVED,
            published_at=days_ago(150),
        )

        db.add_all([post_publicado, post_agendado, post_aprovado, post_rascunho, post_arquivado])
        db.flush()
        print(f"  ✓ {5} posts criados")

        # ── 6. Media Assets ───────────────────────────────────────────────────
        asset1 = MediaAsset(
            post_id=post_publicado.id,
            url="https://cdn.vitaforma.com.br/posts/proteina-slide-01.jpg",
            asset_type=AssetType.IMAGE,
            filename="proteina-slide-01.jpg",
            size_bytes=245_760,
            mime_type="image/jpeg",
            order=1,
        )
        asset2 = MediaAsset(
            post_id=post_publicado.id,
            url="https://cdn.vitaforma.com.br/posts/proteina-slide-02.jpg",
            asset_type=AssetType.IMAGE,
            filename="proteina-slide-02.jpg",
            size_bytes=198_000,
            mime_type="image/jpeg",
            order=2,
        )
        asset3 = MediaAsset(
            post_id=post_publicado.id,
            url="https://cdn.vitaforma.com.br/posts/proteina-slide-03.jpg",
            asset_type=AssetType.IMAGE,
            filename="proteina-slide-03.jpg",
            size_bytes=210_500,
            mime_type="image/jpeg",
            order=3,
        )
        asset4 = MediaAsset(
            post_id=post_agendado.id,
            url="https://cdn.vitaforma.com.br/posts/reels-juliana.mp4",
            asset_type=AssetType.VIDEO,
            filename="reels-juliana.mp4",
            size_bytes=18_500_000,
            mime_type="video/mp4",
            order=1,
        )
        db.add_all([asset1, asset2, asset3, asset4])
        db.flush()
        print(f"  ✓ {4} media assets criados")

        # ── 7. Comentários ────────────────────────────────────────────────────
        comment1 = Comment(
            post_id=post_publicado.id,
            external_comment_id="IG_CMT_001",
            author_username="marcia_fit30",
            body="Que post incrível! Já sinto esse cansaço excessivo faz semanas, vou correr atrás!",
            sentiment=CommentSentiment.POSITIVE,
            classificacao=CommentClassificacao.ELOGIO,
            is_replied=True,
            commented_at=days_ago(7),
        )
        comment2 = Comment(
            post_id=post_publicado.id,
            external_comment_id="IG_CMT_002",
            author_username="juju_wellness",
            body="Qual a quantidade ideal de proteína por dia para quem treina 3x semana?",
            sentiment=CommentSentiment.NEUTRAL,
            classificacao=CommentClassificacao.DUVIDA,
            is_replied=False,
            commented_at=days_ago(7),
        )
        comment3 = Comment(
            post_id=post_publicado.id,
            external_comment_id="IG_CMT_003",
            author_username="patricia_saude",
            body="Vocês enviam para o interior de MG? Quero muito experimentar o Whey de vocês!",
            sentiment=CommentSentiment.POSITIVE,
            classificacao=CommentClassificacao.LEAD_POTENCIAL,
            is_replied=False,
            commented_at=days_ago(6),
        )
        comment4 = Comment(
            post_id=post_publicado.id,
            external_comment_id="IG_CMT_004",
            author_username="carol_nutri",
            body="Recebi o produto com embalagem amassada, fiquei decepcionada 😞",
            sentiment=CommentSentiment.NEGATIVE,
            classificacao=CommentClassificacao.CRITICA,
            is_replied=False,
            commented_at=days_ago(5),
        )
        comment5 = Comment(
            post_id=post_publicado.id,
            external_comment_id="IG_CMT_005",
            author_username="bot_seguidores99",
            body="Ganhe 10.000 seguidores reais! Clique no link da bio!",
            sentiment=CommentSentiment.UNKNOWN,
            classificacao=CommentClassificacao.SPAM,
            is_replied=False,
            commented_at=days_ago(7),
        )
        comment6 = Comment(
            post_id=post_publicado.id,
            external_comment_id="IG_CMT_006",
            author_username="nanda_treina",
            body="Seria incrível vocês lançarem um sabor de chocolate amargo! 🍫",
            sentiment=CommentSentiment.POSITIVE,
            classificacao=CommentClassificacao.SUGESTAO,
            is_replied=False,
            commented_at=days_ago(4),
        )
        db.add_all([comment1, comment2, comment3, comment4, comment5, comment6])
        db.flush()
        print(f"  ✓ {6} comentários criados")

        # ── 8. Sugestões de Resposta ──────────────────────────────────────────
        reply1 = ReplySuggestion(
            comment_id=comment1.id,
            body=(
                "Que alegria, Márcia! 💚 Continue firme e qualquer dúvida sobre proteína "
                "é só chamar. Estamos aqui!"
            ),
            generated_by="manual",
            status=SuggestionStatus.PUBLISHED,
            is_ai_generated=False,
            approved_by_id=admin.id,
            published_at=days_ago(7),
        )
        reply2 = ReplySuggestion(
            comment_id=comment2.id,
            body=(
                "Ótima pergunta, Juju! 😊 A recomendação geral é de 1,6 a 2,2g de proteína "
                "por kg de peso corporal para quem treina. Para uma orientação personalizada, "
                "vale consultar uma nutricionista. Qualquer dúvida sobre nossos produtos, "
                "é só chamar! 💪"
            ),
            generated_by="gpt-4o",
            status=SuggestionStatus.PENDING,
            is_ai_generated=True,
        )
        reply3 = ReplySuggestion(
            comment_id=comment3.id,
            body=(
                "Oi, Patrícia! 💚 Sim, entregamos para todo o Brasil! "
                "Acesse vitaforma.com.br ou chama no Direct que te ajudamos no pedido. "
                "Vai amar! 🥰"
            ),
            generated_by="gpt-4o",
            status=SuggestionStatus.APPROVED,
            is_ai_generated=True,
            approved_by_id=admin.id,
        )
        reply4 = ReplySuggestion(
            comment_id=comment4.id,
            body=(
                "Carol, ficamos muito tristes com isso! 😞 Manda uma mensagem no Direct "
                "com seu número de pedido que resolvemos isso imediatamente. "
                "Você merece o melhor! 💚"
            ),
            generated_by="gpt-4o",
            status=SuggestionStatus.PENDING,
            is_ai_generated=True,
        )
        db.add_all([reply1, reply2, reply3, reply4])
        db.flush()
        print(f"  ✓ {4} sugestões de resposta criadas")

        # ── 9. Leads ──────────────────────────────────────────────────────────
        lead1 = Lead(
            brand_id=brand.id,
            username="patricia_saude",
            full_name="Patrícia Oliveira",
            platform="instagram",
            source=LeadSource.COMMENT,
            status=LeadStatus.NEW,
            notes=(
                "Interessada em comprar Whey. Perguntou sobre entrega para MG. "
                "Comentou no post do carrossel de proteínas em 05/04."
            ),
        )
        lead2 = Lead(
            brand_id=brand.id,
            username="fernanda_c_fitness",
            full_name="Fernanda Carvalho",
            email="fernanda.c@email.com",
            phone="(31) 99876-5432",
            platform="instagram",
            source=LeadSource.DM,
            status=LeadStatus.QUALIFIED,
            notes=(
                "Mandou DM perguntando sobre o programa de emagrecimento + suplementação. "
                "Tem histórico de compra em outras marcas. Alto potencial de conversão."
            ),
        )
        lead3 = Lead(
            brand_id=brand.id,
            username="bianca_run",
            full_name="Bianca Rocha",
            email="bianca.rocha@gmail.com",
            platform="instagram",
            source=LeadSource.STORY_REPLY,
            status=LeadStatus.CONTACTED,
            notes="Respondeu o stories de enquete. Interesse em colágeno e emagrecimento.",
        )
        lead4 = Lead(
            brand_id=brand.id,
            username="soraya_nutrifit",
            full_name="Soraya Lima",
            email="soraya@nutrifit.com.br",
            phone="(11) 98765-1234",
            platform="linkedin",
            source=LeadSource.MANUAL,
            status=LeadStatus.CONVERTED,
            notes=(
                "Nutricionista parceira. Fechou contrato de indicação. "
                "Recebe 10% de comissão por venda indicada."
            ),
        )
        db.add_all([lead1, lead2, lead3, lead4])
        db.flush()
        print(f"  ✓ {4} leads criados")

        # ── 10. Analytics Snapshots ───────────────────────────────────────────
        snapshot1 = AnalyticsSnapshot(
            brand_id=brand.id,
            platform="instagram",
            snapshot_date=days_ago(30),
            followers_count=12_430,
            following_count=856,
            posts_count=312,
            impressions=98_500,
            reach=62_300,
            profile_views=3_420,
            likes_total=4_870,
            comments_total=612,
            shares_total=890,
            saves_total=1_340,
            engagement_rate=4.72,
        )
        snapshot2 = AnalyticsSnapshot(
            brand_id=brand.id,
            platform="instagram",
            snapshot_date=days_ago(7),
            followers_count=13_105,
            following_count=862,
            posts_count=319,
            impressions=115_200,
            reach=74_800,
            profile_views=4_110,
            likes_total=5_640,
            comments_total=743,
            shares_total=1_020,
            saves_total=1_690,
            engagement_rate=5.18,
        )
        snapshot3 = AnalyticsSnapshot(
            brand_id=brand.id,
            platform="linkedin",
            snapshot_date=days_ago(7),
            followers_count=2_890,
            following_count=320,
            posts_count=48,
            impressions=18_400,
            reach=12_100,
            profile_views=980,
            likes_total=620,
            comments_total=87,
            shares_total=145,
            saves_total=None,
            engagement_rate=3.42,
        )
        db.add_all([snapshot1, snapshot2, snapshot3])
        db.flush()
        print(f"  ✓ {3} analytics snapshots criados")

        # ── Commit final ──────────────────────────────────────────────────────
        db.commit()
        print("\n✅  Seed concluído com sucesso!")
        print("\n📊  Resumo:")
        print(f"     Usuários          : 1")
        print(f"     Brands            : 1  (VitaForma)")
        print(f"     Pilares           : 4")
        print(f"     Ideias            : 5")
        print(f"     Posts             : 5  (1 publicado, 1 agendado, 1 aprovado, 1 rascunho, 1 arquivado)")
        print(f"     Media Assets      : 4")
        print(f"     Comentários       : 6  (elogio, dúvida, lead, crítica, spam, sugestão)")
        print(f"     Sugestões Resposta: 4")
        print(f"     Leads             : 4")
        print(f"     Snapshots         : 3\n")
        print("  🔑  Login: admin@vitaforma.com.br  |  Senha: Vitaforma1")

    except Exception as exc:
        db.rollback()
        print(f"\n❌  Seed falhou: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
