"""AuthService — authentication and registration business logic."""
from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app_time import now_utc
from config import config
from database.models.user import User
from database.repositories.audit_log_repository import AuditLogRepository
from database.repositories.refresh_token_repository import RefreshTokenRepository
from database.repositories.user_repository import UserRepository

# bcrypt context — passlib handles salt generation automatically
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

RGM_RE = re.compile(r"^\d{8}$")


class AuthError(Exception):
    """Raised for authentication/authorization failures."""

    def __init__(self, message: str, status_code: int = 401) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AuthService:
    """
    Handles user registration, login, token creation, and admin bootstrapping.

    Uses OOP: each instance holds a scoped DB session and operates through
    the UserRepository and AuditLogRepository data-access objects.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self._users = UserRepository(db)
        self._audit = AuditLogRepository(db)
        self._refresh = RefreshTokenRepository(db)

    # ── Session lifecycle ─────────────────────────────────────────────────────

    def _issue_session(
        self,
        user: User,
        *,
        family_id=None,
        user_agent: str | None = None,
        client_ip: str | None = None,
    ) -> dict:
        """Mint an access/refresh pair. A new family_id starts a new session."""
        refresh_token, row = self._refresh.issue(
            user_id=user.id,
            ttl_days=config.REFRESH_TOKEN_DAYS,
            family_id=family_id,
            user_agent=user_agent,
            client_ip=client_ip,
        )
        access = self.create_access_token(user)
        return {
            "token":         access,   # legacy key name, kept for the web frontend
            "access_token":  access,
            "refresh_token": refresh_token,
            "token_type":    "Bearer",
            "expires_in":    config.ACCESS_TOKEN_MINUTES * 60,
            "_family_id":    row.family_id,
        }

    def refresh_session(
        self,
        refresh_token: str,
        *,
        user_agent: str | None = None,
        client_ip: str | None = None,
    ) -> tuple[dict, User]:
        """
        Exchange a refresh token for a new pair, rotating it.

        Raises AuthError on anything suspicious. The interesting case is reuse:
        a correct client spends each token exactly once, so a second use means
        the value was captured. The server cannot tell the thief from the
        victim, so the entire family is revoked and both must log in again --
        noisy on purpose, because the alternative is a stolen session that
        renews itself forever.
        """
        row = self._refresh.find_by_token(refresh_token)
        if row is None:
            raise AuthError("Sessão inválida. Faça login novamente.", 401)

        now = now_utc()

        if row.used_at is not None or row.revoked_at is not None:
            revoked = self._refresh.revoke_family(row.family_id)
            self._audit.log(
                action="USER_LOGOUT",
                user_id=row.user_id,
                details={"event": "refresh_token_reuse_detected",
                         "family": str(row.family_id), "revoked": revoked},
            )
            self.db.commit()
            raise AuthError(
                "Sessão encerrada por motivo de segurança. Faça login novamente.", 401
            )

        if row.expires_at <= now:
            raise AuthError("Sessão expirada. Faça login novamente.", 401)

        user = self._users.find_by_id(row.user_id)
        if user is None:
            raise AuthError("Usuário não encontrado.", 401)

        # Re-checked on every refresh, which is what makes deactivation take
        # effect within one access-token lifetime instead of never.
        if not user.is_active:
            self._refresh.revoke_family(row.family_id)
            self.db.commit()
            raise AuthError(
                "Esta conta está desativada. Procure a administração do CESUCA.", 403
            )

        self._refresh.mark_used(row, now)
        session = self._issue_session(
            user, family_id=row.family_id, user_agent=user_agent, client_ip=client_ip
        )
        self.db.commit()
        return session, user

    def logout(self, refresh_token: str | None) -> dict:
        """Revoke the presented session. Silent when the token is unknown."""
        if not refresh_token:
            return {"message": "Sessão encerrada."}
        row = self._refresh.find_by_token(refresh_token)
        if row is None:
            return {"message": "Sessão encerrada."}
        revoked = self._refresh.revoke_family(row.family_id)
        self._audit.log(
            action="USER_LOGOUT",
            user_id=row.user_id,
            details={"family": str(row.family_id), "revoked": revoked},
        )
        self.db.commit()
        return {"message": "Sessão encerrada."}

    def list_sessions(self, user_id) -> list[dict]:
        return [row.to_dict() for row in self._refresh.find_active_for_user(user_id)]

    def revoke_all_sessions(self, user_id) -> dict:
        count = self._refresh.revoke_all_for_user(user_id)
        self._audit.log(
            action="USER_LOGOUT",
            user_id=user_id,
            details={"event": "all_sessions_revoked", "revoked": count},
        )
        self.db.commit()
        return {"message": "Todas as sessões foram encerradas.", "revoked": count}

    # ── Password helpers ───────────────────────────────────────────────────────

    @staticmethod
    def hash_password(plain: str) -> str:
        return _pwd_context.hash(plain)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return _pwd_context.verify(plain, hashed)

    # ── JWT helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def create_access_token(user: User) -> str:
        """
        Short-lived bearer token. Stateless: verified by signature and expiry
        alone, never looked up. Its lifetime is therefore also the maximum
        delay before a disabled account or a changed role stops taking effect.
        """
        now = datetime.now(UTC)
        payload = {
            "sub":  str(user.id),
            "rgm":  user.rgm,
            "role": user.role,
            "typ":  "access",
            "iat":  now,
            "exp":  now + timedelta(minutes=config.ACCESS_TOKEN_MINUTES),
        }
        return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)

    # Kept so nothing breaks on the old name.
    create_token = create_access_token

    @staticmethod
    def decode_token(token: str) -> dict:
        try:
            return jwt.decode(
                token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM]
            )
        except Exception as exc:
            raise AuthError("Token inválido ou expirado.", 401) from exc

    # ── Validation ────────────────────────────────────────────────────────────

    @staticmethod
    def validate_rgm(rgm: str) -> None:
        if not RGM_RE.match(rgm):
            raise AuthError("RGM deve conter exatamente 8 dígitos numéricos.", 400)

    @staticmethod
    def validate_password(password: str) -> None:
        if not password or len(password) < 6:
            raise AuthError("A senha deve ter pelo menos 6 caracteres.", 400)

    @staticmethod
    def validate_role(role: str) -> None:
        if role not in ("passenger", "driver"):
            raise AuthError("Tipo de usuário inválido. Use 'passenger' ou 'driver'.", 400)

    # ── Business operations ───────────────────────────────────────────────────

    def login(
        self,
        rgm: str,
        password: str,
        *,
        user_agent: str | None = None,
        client_ip: str | None = None,
    ) -> tuple[dict, User]:
        """
        Authenticate a user by RGM and password.

        Returns:
            (jwt_token, user) on success.

        Raises:
            AuthError on invalid credentials.
        """
        self.validate_rgm(rgm)
        if not password:
            raise AuthError("Informe sua senha.", 400)

        user = self._users.find_by_rgm(rgm)
        if not user or not self.verify_password(password, user.password_hash):
            # Uniform error to prevent user enumeration
            raise AuthError("RGM ou senha inválidos.", 401)

        # Checked only after the password is verified, so this cannot be used
        # to discover which RGMs exist -- reaching this line already requires
        # the correct credentials.
        if not user.is_active:
            self._audit.log(
                action="USER_LOGIN",
                user_id=user.id,
                details={"rgm": rgm, "rejected": "account_disabled"},
            )
            self.db.commit()
            raise AuthError(
                "Esta conta está desativada. Procure a administração do CESUCA.", 403
            )

        session = self._issue_session(user, user_agent=user_agent, client_ip=client_ip)
        self._audit.log(
            action="USER_LOGIN",          # matches AuditAction.USER_LOGIN
            user_id=user.id,
            details={"rgm": rgm, "family": str(session.pop("_family_id"))},
        )
        self.db.commit()
        return session, user

    def register(
        self,
        full_name: str,
        rgm: str,
        password: str,
        role: str = "passenger",
        course: str | None = None,
        city: str | None = None,
        neighborhood: str | None = None,
        phone: str | None = None,
        vehicle_model: str | None = None,
        vehicle_brand: str | None = None,
        vehicle_color: str | None = None,
        vehicle_seats: int | None = None,
        vehicle_plate: str | None = None,
        user_agent: str | None = None,
        client_ip: str | None = None,
    ) -> tuple[dict, User]:
        """
        Register a new user.

        Returns:
            (jwt_token, user) on success.

        Raises:
            AuthError on validation failure or duplicate RGM.
        """
        if not full_name or not full_name.strip():
            raise AuthError("Informe o nome completo.", 400)
        self.validate_rgm(rgm)
        self.validate_password(password)
        self.validate_role(role)

        # Block admin RGM from self-registration
        if rgm == config.ADMIN_RGM:
            raise AuthError("Este RGM não está disponível para cadastro.", 400)

        if self._users.exists_by_rgm(rgm):
            raise AuthError("Este RGM já está cadastrado. Faça login ou use outro RGM.", 409)

        user = self._users.create(
            full_name=full_name.strip(),
            rgm=rgm,
            password_hash=self.hash_password(password),
            role=role,
            course=course,
            city=city,
            neighborhood=neighborhood,
            phone=phone,
            vehicle_model=vehicle_model,
            vehicle_brand=vehicle_brand,
            vehicle_color=vehicle_color,
            vehicle_seats=vehicle_seats,
            vehicle_plate=vehicle_plate,
        )

        self._audit.log(
            action="USER_REGISTERED",     # matches AuditAction.USER_REGISTERED
            user_id=user.id,
            details={"rgm": rgm, "role": role},
        )
        self.db.commit()
        self.db.refresh(user)

        session = self._issue_session(user, user_agent=user_agent, client_ip=client_ip)
        session.pop("_family_id", None)
        self.db.commit()
        return session, user

    def get_current_user(self, user_id) -> User:
        """Load user by ID or raise 401."""
        user = self._users.find_by_id(user_id)
        if not user:
            raise AuthError("Usuário não encontrado.", 404)
        return user

    def update_self(self, user_id, body) -> User:
        """Allow a user to update their own profile, including role switch."""
        user = self.get_current_user(user_id)
        fields = {k: v for k, v in body.model_dump().items() if v is not None}
        # Admins cannot downgrade their own role via this endpoint
        if user.role == "ADMIN":
            fields.pop("role", None)
        updated = self._users.update(user.id, **fields)
        self._audit.log(
            action="USER_UPDATED",
            user_id=user.id,
            details={"fields": list(fields.keys())},
        )
        self.db.commit()
        return updated

    # ── Admin bootstrap ────────────────────────────────────────────────────────

    def ensure_admin_exists(self) -> None:
        """
        Called at application startup.

        Creates the administrator account (RGM 00000001) if it does not exist.
        Password must be set via the ADMIN_PASSWORD environment variable.
        """
        if self._users.exists_by_rgm(config.ADMIN_RGM):
            return

        admin_password = config.ADMIN_PASSWORD
        if not admin_password:
            raise RuntimeError(
                "ADMIN_PASSWORD environment variable is not set. "
                "Set it in .env before starting the server."
            )
        if len(admin_password) < 8:
            raise RuntimeError("ADMIN_PASSWORD must be at least 8 characters.")

        self._users.create(
            full_name=config.ADMIN_FULL_NAME,
            rgm=config.ADMIN_RGM,
            password_hash=self.hash_password(admin_password),
            role="admin",
        )
        self._audit.log(
            action="ADMIN_ACTION",        # matches AuditAction.ADMIN_ACTION
            user_id=None,
            details={"event": "admin_account_created", "rgm": config.ADMIN_RGM},
        )
        self.db.commit()
        print(f"[CESUCAR] Admin account created — RGM: {config.ADMIN_RGM}")
