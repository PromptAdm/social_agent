"""
Service: Auth
Lógica central de autenticação do Social Agent.

Operações:
    register        — cria conta com validação de unicidade e força de senha
    login_json      — autentica via payload JSON (frontend/mobile)
    login_form      — autentica via OAuth2PasswordRequestForm (Swagger/OAuth2)
    refresh_tokens  — renova o par de tokens a partir de um refresh_token válido
    change_password — troca de senha exigindo a senha atual
    _authenticate   — helper interno: valida credenciais e atualiza last_login_at
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import (
    access_token_expires_in,
    create_token_pair,
    decode_refresh_token,
    hash_password,
    refresh_token_expires_in,
    verify_password,
)
from app.models.user import User
from app.schemas.token import LoginRequest, Token, TokenResponse
from app.schemas.user import UserChangePassword, UserCreate, UserOut

# Hash fixo usado para manter tempo de resposta constante quando o e-mail
# não existe. Garante que verify_password (bcrypt, ~100 ms) sempre execute,
# impedindo enumeração de usuários por análise de timing.
_DUMMY_HASH: str = hash_password("Dummy123!")


# ── Helper interno ─────────────────────────────────────────────────────────────

def _authenticate(db: Session, email: str, password: str) -> User:
    """
    Valida e-mail e senha, atualiza last_login_at e retorna o User.
    Lança HTTPException 401 para credenciais inválidas e 403 para conta inativa.

    Proteções:
    - Mensagem de erro unificada (anti-enumeração de e-mail)
    - verify_password sempre executado, mesmo para e-mail inexistente
      (anti-timing attack: bcrypt leva ~100 ms e o short-circuit do `or`
       tornaria respostas para e-mails inexistentes mensuravelmente mais rápidas)
    """
    user: User | None = db.query(User).filter(User.email == email).first()

    # Sempre executa bcrypt, independentemente de o usuário existir.
    # Usa _DUMMY_HASH como alvo quando o e-mail não é encontrado para garantir
    # tempo de resposta equivalente ao de uma verificação real.
    _hash = user.hashed_password if user else _DUMMY_HASH
    password_valid = verify_password(password, _hash)

    if not user or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada. Entre em contato com o suporte.",
        )

    # Registra o momento do login para auditoria
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def _build_token_response(user: User) -> TokenResponse:
    """
    Gera o par access/refresh token e monta o TokenResponse completo.
    Inclui dados do usuário para evitar chamada extra ao /me.
    """
    access_token, refresh_token = create_token_pair(user.id)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=access_token_expires_in(),
        refresh_token_expires_in=refresh_token_expires_in(),
        user=UserOut.model_validate(user),
    )


# ── Operações públicas ─────────────────────────────────────────────────────────

def register(db: Session, payload: UserCreate) -> User:
    """
    Cria um novo usuário no sistema.

    Validações:
        - E-mail único (409 se já existir — verificação prévia + catch de IntegrityError
          para cobrir inserções concorrentes com o mesmo e-mail)
        - Força de senha (delegado ao schema UserCreate via Pydantic)
    """
    # Verificação antecipada — fornece mensagem de erro imediata na maioria dos casos
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado.",
        )

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)

    # IntegrityError: cobre janela de corrida (TOCTOU) — dois requests simultâneos com
    # o mesmo e-mail passam pela verificação, mas apenas um comita; o outro recebe 409.
    # SQLAlchemyError: captura erros de schema/conexão (ex: coluna ausente após
    # migration mal aplicada) e evita que propaguem como 500 sem mensagem útil.
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado.",
        )
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao criar usuário. Verifique as migrações do banco.",
        ) from exc

    db.refresh(user)
    return user


def login_json(db: Session, payload: LoginRequest) -> TokenResponse:
    """
    Autentica via JSON body — rota principal para frontends e apps mobile.
    Retorna par de tokens + dados do usuário.
    """
    user = _authenticate(db, payload.email, payload.password)
    return _build_token_response(user)


def login_form(db: Session, email: str, password: str) -> Token:
    """
    Autentica via OAuth2PasswordRequestForm — mantido para compatibilidade
    com o Swagger UI e fluxos OAuth2 padrão.
    Retorna apenas o access_token (schema mínimo OAuth2).
    """
    user = _authenticate(db, email, password)
    access_token, _ = create_token_pair(user.id)
    return Token(access_token=access_token)


def refresh_tokens(db: Session, refresh_token: str) -> TokenResponse:
    """
    Renova o par de tokens usando um refresh_token válido.

    Lança 401 se:
        - Token inválido, expirado ou do tipo errado
        - Usuário não encontrado ou inativo
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Refresh token inválido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_refresh_token(refresh_token)
        user_id_str: str | None = payload.get("sub")
        if not user_id_str:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    user: User | None = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada.",
        )

    return _build_token_response(user)


def change_password(
    db: Session,
    user: User,
    payload: UserChangePassword,
) -> None:
    """
    Troca a senha do usuário autenticado exigindo confirmação da senha atual.
    A validação de força da nova senha é feita pelo schema UserChangePassword.

    Lança 400 se a senha atual não corresponder ao hash armazenado.
    """
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta.",
        )

    user.hashed_password = hash_password(payload.new_password)
    db.commit()
